#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function hasTable(database, tableName) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(tableName));
}

function readTable(database, tableName) {
  if (!hasTable(database, tableName)) throw new Error(`Sonic SQLite 缺少 ${tableName} 表`);
  return database.prepare(`SELECT * FROM "${tableName}"`).all();
}

export function readSonicSqlite(inputPath) {
  const database = new DatabaseSync(inputPath, { readOnly: true });
  try {
    return {
      version: "sqlite",
      export_date: new Date().toISOString(),
      post: readTable(database, "post"),
      tag: readTable(database, "tag"),
      post_tag: readTable(database, "post_tag"),
    };
  } finally {
    database.close();
  }
}

function sql(value) {
  if (value == null) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeSlug(value, fallback) {
  const normalized = asString(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized || fallback;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeStatus(value) {
  const status = asString(value).toUpperCase();
  if (status === "PUBLISHED" || status === "0") return "published";
  if (status === "RECYCLE" || status === "2") return "recycle";
  return "draft";
}

function isArticleType(value) {
  const type = asString(value).toUpperCase();
  return type === "POST" || type === "0" || type === "";
}

function isMarkdownEditor(value) {
  const editor = asString(value).toUpperCase();
  return editor === "MARKDOWN" || editor === "0" || editor === "";
}

function estimateReadingMinutes(markdown) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#[\]()*_>~-]/g, " ");
  const chineseCharacters = plainText.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinWords = plainText.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(chineseCharacters / 400 + latinWords / 220));
}

function extractPostSummary(markdown, maxLength = 100) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(plainText).slice(0, maxLength).join("");
}

function isSonicGeneratedSummary(summary, formattedHtml) {
  if (!summary) return true;
  const sonicPlainText = asString(formattedHtml)
    .replace(/<[^>]*>/g, "")
    .replace(/[\t\r\n]/g, "");
  return summary === Array.from(sonicPlainText).slice(0, Array.from(summary).length).join("");
}

function createTagRegistry(source) {
  const byKey = new Map();
  const bySourceTagId = new Map();
  const usedSlugs = new Set();
  const usedNames = new Set();

  function register(item) {
    const name = asString(item.name).trim();
    if (!name) return null;
    const nameKey = name.toLocaleLowerCase("zh-CN");
    let tag = byKey.get(nameKey);
    if (!tag) {
      let slug = normalizeSlug(item.slug || name, `tag-${item.id}`);
      const originalSlug = slug;
      let suffix = 2;
      while (usedSlugs.has(slug)) slug = `${originalSlug.slice(0, 112)}-${suffix++}`;
      let uniqueName = name;
      let nameSuffix = 2;
      while (usedNames.has(uniqueName.toLocaleLowerCase("zh-CN"))) uniqueName = `${name} (${nameSuffix++})`;
      tag = { name: uniqueName, slug };
      byKey.set(nameKey, tag);
      usedSlugs.add(slug);
      usedNames.add(uniqueName.toLocaleLowerCase("zh-CN"));
    }
    return tag;
  }

  for (const item of asArray(source.tag)) {
    const tag = register(item);
    if (tag) bySourceTagId.set(Number(item.id), tag);
  }

  return {
    tags: Array.from(new Set(bySourceTagId.values())),
    bySourceTagId,
  };
}

export async function convertSonicExport(source) {
  if (!source || typeof source !== "object" || !Array.isArray(source.post)) {
    throw new Error("不是有效的 Sonic 完整 JSON：缺少 post 数组");
  }

  const tagRegistry = createTagRegistry(source);
  const postTagIds = new Map();
  for (const relation of asArray(source.post_tag)) {
    const postId = Number(relation.post_id);
    const ids = postTagIds.get(postId) ?? [];
    ids.push(Number(relation.tag_id));
    postTagIds.set(postId, ids);
  }
  const missingTagRelations = asArray(source.post_tag).filter(
    (relation) => !tagRegistry.bySourceTagId.has(Number(relation.tag_id)),
  );

  const report = {
    sourceVersion: asString(source.version) || "unknown",
    sourceExportDate: asString(source.export_date) || null,
    counts: {
      sourcePosts: source.post.length,
      sourceArticles: source.post.filter((post) => isArticleType(post.type)).length,
      importedPosts: 0,
      publishedPosts: 0,
      draftPosts: 0,
      skippedRecyclePosts: 0,
      importedTags: tagRegistry.tags.length,
    },
    richTextDrafts: [],
    duplicatePostSlugs: [],
    normalizedPostSlugs: [],
    skippedIndependentPages: [],
    skippedPosts: [],
    missingTagRelations: missingTagRelations.map((relation) => ({
      postId: Number(relation.post_id),
      missingTagId: Number(relation.tag_id),
    })),
    postsOverTwelveTags: [],
    relativeImageReferences: [],
    insecureImageReferences: [],
    shortcodePosts: [],
    ignoredData: {},
    unsupportedData: {},
  };

  const posts = [];
  const seenPostSlugs = new Set();
  for (const sourcePost of source.post) {
    const sourceId = Number(sourcePost.id);
    const title = asString(sourcePost.title).trim();
    if (!isArticleType(sourcePost.type)) {
      report.skippedIndependentPages.push({
        id: sourceId,
        title,
        slug: asString(sourcePost.slug),
      });
      continue;
    }
    const slug = normalizeSlug(sourcePost.slug || title, `sonic-post-${sourceId}`);
    if (slug !== asString(sourcePost.slug)) {
      report.normalizedPostSlugs.push({ id: sourceId, original: asString(sourcePost.slug), normalized: slug });
    }
    const sourceStatus = normalizeStatus(sourcePost.status);
    if (sourceStatus === "recycle") {
      report.counts.skippedRecyclePosts += 1;
      report.skippedPosts.push({ id: sourceId, title, reason: "回收站文章" });
      continue;
    }
    if (!title) {
      report.skippedPosts.push({ id: sourceId, title, reason: "标题为空" });
      continue;
    }
    if (seenPostSlugs.has(slug)) {
      report.duplicatePostSlugs.push({ id: sourceId, title, slug });
      continue;
    }
    seenPostSlugs.add(slug);

    const markdownEditor = isMarkdownEditor(sourcePost.editor_type);
    const markdown = asString(sourcePost.original_content) || asString(sourcePost.format_content);
    const status = markdownEditor ? sourceStatus : "draft";
    if (!markdownEditor) report.richTextDrafts.push({ id: sourceId, title, slug });

    const relatedTags = [
      ...(postTagIds.get(sourceId) ?? []).map((id) => tagRegistry.bySourceTagId.get(id)),
    ].filter(Boolean);
    const tags = Array.from(new Map(relatedTags.map((tag) => [tag.slug, tag])).values());
    if (tags.length > 12) report.postsOverTwelveTags.push({ id: sourceId, title, count: tags.length });

    for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
      const imageUrl = match[1];
      if (/^http:\/\//i.test(imageUrl)) report.insecureImageReferences.push({ id: sourceId, slug, url: imageUrl });
      else if (!/^https?:\/\//i.test(imageUrl) && !/^data:/i.test(imageUrl)) report.relativeImageReferences.push({ id: sourceId, slug, url: imageUrl });
    }
    if (/\{\{<|\{%/.test(markdown)) report.shortcodePosts.push({ id: sourceId, title, slug });

    const createdAt = normalizeDate(sourcePost.create_time) ?? new Date(0).toISOString();
    const updatedAt = normalizeDate(sourcePost.edit_time) ?? normalizeDate(sourcePost.update_time) ?? createdAt;
    posts.push({
      sourceId,
      title,
      slug,
      summary: isSonicGeneratedSummary(asString(sourcePost.summary), sourcePost.format_content)
        ? extractPostSummary(markdown)
        : asString(sourcePost.summary).trim(),
      markdown,
      renderedHtml: markdownEditor ? String(await markdownProcessor.process(markdown)) : "",
      status,
      readingMinutes: estimateReadingMinutes(markdown),
      publishedAt: status === "published" ? createdAt : null,
      createdAt,
      updatedAt,
      tags,
    });
    report.counts.importedPosts += 1;
    report.counts[status === "published" ? "publishedPosts" : "draftPosts"] += 1;
  }

  for (const key of ["category", "post_category", "link", "option", "user", "attachments", "comment", "comment_black", "journal", "menu", "meta", "photo", "theme_setting", "log"]) {
    const count = asArray(source[key]).length;
    if (count) report.ignoredData[key] = count;
  }

  return { posts, tags: tagRegistry.tags, report };
}

export function generateImportSql(converted) {
  const statements = [
    "PRAGMA foreign_keys = ON;",
    "",
    "-- Sonic 标签（分类不导入）",
  ];

  for (const tag of converted.tags) {
    statements.push(`INSERT INTO tags (name, slug) VALUES (${sql(tag.name)}, ${sql(tag.slug)}) ON CONFLICT(slug) DO UPDATE SET name = excluded.name;`);
  }

  statements.push("", "-- Sonic 文章");
  for (const post of converted.posts) {
    statements.push(
      `INSERT INTO posts (title, slug, summary, markdown, rendered_html, status, reading_minutes, published_at, created_at, updated_at) VALUES (${sql(post.title)}, ${sql(post.slug)}, ${sql(post.summary)}, ${sql(post.markdown)}, ${sql(post.renderedHtml)}, ${sql(post.status)}, ${post.readingMinutes}, ${sql(post.publishedAt)}, ${sql(post.createdAt)}, ${sql(post.updatedAt)}) ON CONFLICT(slug) DO UPDATE SET title = excluded.title, summary = excluded.summary, markdown = excluded.markdown, rendered_html = excluded.rendered_html, status = excluded.status, reading_minutes = excluded.reading_minutes, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at;`,
      `DELETE FROM post_tags WHERE post_id = (SELECT id FROM posts WHERE slug = ${sql(post.slug)});`,
    );
    for (const tag of post.tags) {
      statements.push(`INSERT OR IGNORE INTO post_tags (post_id, tag_id) SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = ${sql(post.slug)} AND t.slug = ${sql(tag.slug)};`);
    }
  }

  statements.push("");
  return statements.join("\n");
}

function parseArguments(argv) {
  const args = { input: "", output: "sonic-import.sql", report: "sonic-import-report.json", force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--input") args.input = argv[++index] ?? "";
    else if (argument === "--output") args.output = argv[++index] ?? "";
    else if (argument === "--report") args.report = argv[++index] ?? "";
    else if (argument === "--force") args.force = true;
    else if (!argument.startsWith("-") && !args.input) args.input = argument;
    else throw new Error(`未知参数：${argument}`);
  }
  if (!args.input) throw new Error("请提供 Sonic 完整 JSON：node scripts/migrate-sonic.mjs --input <文件>");
  return args;
}

async function writeNewFile(path, content, force) {
  await writeFile(path, content, { encoding: "utf8", flag: force ? "w" : "wx" });
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const inputPath = resolve(args.input);
  const source = /\.(?:db|sqlite|sqlite3)$/i.test(inputPath)
    ? readSonicSqlite(inputPath)
    : JSON.parse(await readFile(inputPath, "utf8"));
  const converted = await convertSonicExport(source);
  const outputPath = resolve(args.output);
  const reportPath = resolve(args.report);
  await writeNewFile(outputPath, generateImportSql(converted), args.force);
  await writeNewFile(reportPath, `${JSON.stringify(converted.report, null, 2)}\n`, args.force);
  console.log(`已生成 SQL：${outputPath}`);
  console.log(`已生成报告：${reportPath}`);
  console.log(`文章 ${converted.report.counts.importedPosts} 篇，标签 ${converted.report.counts.importedTags} 个。`);
  if (converted.report.richTextDrafts.length) console.warn(`注意：${converted.report.richTextDrafts.length} 篇富文本文章已转为草稿，请人工检查。`);
  if (converted.report.missingTagRelations.length) console.warn(`注意：${converted.report.missingTagRelations.length} 条文章标签关系缺少标签实体，无法恢复。`);
  if (Object.keys(converted.report.ignoredData).length) console.warn("注意：报告中列出了按迁移范围忽略的数据类型。");
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
