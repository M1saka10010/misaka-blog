import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 迁移器是可直接由 Node.js 执行的 ESM 脚本，不参与应用打包。
// @ts-expect-error JavaScript CLI 不提供 TypeScript 声明文件。
import { convertSonicExport, generateImportSql, readSonicSqlite } from "../../scripts/migrate-sonic.mjs";

const source = {
  version: "1.2.3",
  export_date: "2026-07-30 10:00:00",
  post: [
    { id: 1, type: "POST", title: "Markdown's post", slug: "markdown-post", summary: "摘要", original_content: "# 正文", format_content: "<h1>正文</h1>", editor_type: "MARKDOWN", status: "PUBLISHED", create_time: "2024-01-02T03:04:05Z" },
    { id: 2, type: "POST", title: "富文本", slug: "rich", original_content: "<p>正文</p>", editor_type: "RICHTEXT", status: "PUBLISHED", create_time: "2024-02-02T03:04:05Z" },
    { id: 3, type: "POST", title: "回收站", slug: "deleted", original_content: "no", editor_type: "MARKDOWN", status: "RECYCLE" },
    { id: 4, type: "SHEET", title: "关于我", slug: "about", original_content: "页面", editor_type: "MARKDOWN", status: "PUBLISHED" },
  ],
  tag: [{ id: 10, name: "技术", slug: "tech" }],
  category: [{ id: 20, name: "生活", slug: "life" }],
  post_tag: [{ post_id: 1, tag_id: 10 }],
  post_category: [{ post_id: 1, category_id: 20 }],
  link: [
    { id: 30, name: "朋友", url: "https://friend.example/", description: "友链", logo: "https://friend.example/icon.png", priority: 2 },
    { id: 31, name: "不安全", url: "http://insecure.example/" },
  ],
  option: [
    { option_key: "blog_title", option_value: "旧博客" },
    { option_key: "seo_description", option_value: "旧站简介" },
  ],
  user: [{ nickname: "站长", description: "个人简介", avatar: "https://example.com/avatar.png", email: "me@example.com" }],
  comment: [{ id: 1 }],
};

describe("Sonic 整站迁移", () => {
  it("只转换文章、原有标签及其关系", async () => {
    const converted = await convertSonicExport(source);
    expect(converted.posts).toHaveLength(2);
    expect(converted.posts[0].status).toBe("published");
    expect(converted.posts[1].summary).toBe("正文");
    expect(converted.posts[0].tags.map((tag: { name: string }) => tag.name)).toEqual(["技术"]);
    expect(converted.posts[1].status).toBe("draft");
    expect(converted.tags).toEqual([{ name: "技术", slug: "tech" }]);
    expect(converted.report.counts.skippedRecyclePosts).toBe(1);
    expect(converted.report.skippedIndependentPages).toEqual([{ id: 4, title: "关于我", slug: "about" }]);
    expect(converted.report.ignoredData.category).toBe(1);
    expect(converted.report.ignoredData.link).toBe(2);
    expect(converted.report.ignoredData.comment).toBe(1);
  });

  it("重算 Sonic 自动摘要但保留手写摘要", async () => {
    const automaticSource = structuredClone(source);
    automaticSource.post[0].summary = "正文";
    automaticSource.post[0].format_content = "<h1>正文</h1>";
    automaticSource.post[1].summary = "单独设置的摘要";
    automaticSource.post[1].format_content = "<p>正文</p>";
    const converted = await convertSonicExport(automaticSource);
    expect(converted.posts[0].summary).toBe("正文");
    expect(converted.posts[1].summary).toBe("单独设置的摘要");
  });

  it("生成幂等 SQL 并正确转义文本", async () => {
    const converted = await convertSonicExport(source);
    const output = generateImportSql(converted);
    expect(output).toContain("Markdown''s post");
    expect(output).toContain("ON CONFLICT(slug) DO UPDATE");
    expect(output).not.toContain("site_settings");
    expect(output).not.toContain("friend_links");
  });

  it("从 Sonic SQLite 只读取文章、标签与关联", () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "sonic-migration-"));
    const databasePath = join(temporaryDirectory, "sonic.db");
    try {
      const database = new DatabaseSync(databasePath);
      database.exec(`
        CREATE TABLE post (id INTEGER PRIMARY KEY, title TEXT, slug TEXT, original_content TEXT, format_content TEXT, editor_type INTEGER, status INTEGER, summary TEXT, create_time TEXT, update_time TEXT, edit_time TEXT);
        CREATE TABLE tag (id INTEGER PRIMARY KEY, name TEXT, slug TEXT);
        CREATE TABLE post_tag (id INTEGER PRIMARY KEY, post_id INTEGER, tag_id INTEGER);
        CREATE TABLE category (id INTEGER PRIMARY KEY, name TEXT);
        INSERT INTO post VALUES (1, '文章', 'post', '# 正文', '<h1>正文</h1>', 0, 0, '', '2024-01-02T03:04:05Z', NULL, NULL);
        INSERT INTO tag VALUES (2, '技术', 'tech');
        INSERT INTO post_tag VALUES (3, 1, 2);
        INSERT INTO category VALUES (4, '不应读取');
      `);
      database.close();

      const sqliteSource = readSonicSqlite(databasePath);
      expect(sqliteSource.post).toHaveLength(1);
      expect(sqliteSource.tag).toEqual([{ id: 2, name: "技术", slug: "tech" }]);
      expect(sqliteSource.post_tag).toEqual([{ id: 3, post_id: 1, tag_id: 2 }]);
      expect(sqliteSource).not.toHaveProperty("category");
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
