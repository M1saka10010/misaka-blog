export interface AdminPostInput {
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  renderedHtml: string;
  status: "draft" | "published";
  readingMinutes: number;
  tags: string[];
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeTagNames(value: string | string[]) {
  const tagValues = Array.isArray(value) ? value : value.split(/[,，]/);
  return Array.from(
    new Set(
      tagValues
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

export async function listAdminTags(database: D1Database) {
  const result = await database.prepare(
    "SELECT name FROM tags ORDER BY name COLLATE NOCASE",
  ).all<{ name: string }>();
  return result.results.map((tag) => tag.name);
}

export async function getAdminSiteTitle(database: D1Database) {
  const settings = await database.prepare(
    "SELECT site_title FROM site_settings WHERE id = 1",
  ).first<{ site_title: string }>();
  return settings?.site_title || "MISAKA.LOG";
}

export async function listAdminPosts(database: D1Database) {
  const result = await database.prepare(
    `SELECT id, title, slug, status, published_at, updated_at
     FROM posts ORDER BY updated_at DESC`,
  ).all<{
    id: number;
    title: string;
    slug: string;
    status: "draft" | "published";
    published_at: string | null;
    updated_at: string;
  }>();
  return result.results;
}

export async function getAdminPost(database: D1Database, id: number) {
  const post = await database.prepare(
    `SELECT id, title, slug, summary, markdown, status, published_at
     FROM posts WHERE id = ? LIMIT 1`,
  ).bind(id).first<{
    id: number;
    title: string;
    slug: string;
    summary: string;
    markdown: string;
    status: "draft" | "published";
    published_at: string | null;
  }>();
  if (!post) return null;
  const tagRows = await database.prepare(
    `SELECT tags.name FROM tags
     JOIN post_tags ON post_tags.tag_id = tags.id
     WHERE post_tags.post_id = ? ORDER BY tags.name`,
  ).bind(id).all<{ name: string }>();
  return { ...post, tags: tagRows.results.map((tag) => tag.name) };
}

async function replacePostTags(database: D1Database, postId: number, tagNames: string[]) {
  const statements: D1PreparedStatement[] = [
    database.prepare("DELETE FROM post_tags WHERE post_id = ?").bind(postId),
  ];
  for (const name of tagNames) {
    const slug = normalizeSlug(name);
    if (!slug) continue;
    statements.push(
      database.prepare("INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)").bind(name, slug),
      database.prepare(
        `INSERT OR IGNORE INTO post_tags (post_id, tag_id)
         SELECT ?, id FROM tags WHERE slug = ?`,
      ).bind(postId, slug),
    );
  }
  await database.batch(statements);
}

export async function createPost(database: D1Database, input: AdminPostInput) {
  const publishedAt = input.status === "published" ? new Date().toISOString() : null;
  const result = await database.prepare(
    `INSERT INTO posts
      (title, slug, summary, markdown, rendered_html, status, reading_minutes, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    input.title,
    input.slug,
    input.summary,
    input.markdown,
    input.renderedHtml,
    input.status,
    input.readingMinutes,
    publishedAt,
  ).run();
  const postId = Number(result.meta.last_row_id);
  await replacePostTags(database, postId, input.tags);
  return postId;
}

export async function updatePost(database: D1Database, id: number, input: AdminPostInput) {
  const current = await database.prepare("SELECT slug, published_at FROM posts WHERE id = ?")
    .bind(id)
    .first<{ slug: string; published_at: string | null }>();
  if (!current) throw new Response("文章不存在", { status: 404 });
  const publishedAt = input.status === "published"
    ? current.published_at ?? new Date().toISOString()
    : null;
  await database.batch([
    database.prepare(
      `UPDATE posts SET title = ?, slug = ?, summary = ?, markdown = ?, rendered_html = ?,
       status = ?, reading_minutes = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(
      input.title,
      input.slug,
      input.summary,
      input.markdown,
      input.renderedHtml,
      input.status,
      input.readingMinutes,
      publishedAt,
      id,
    ),
    ...(current.slug !== input.slug
      ? [database.prepare("INSERT OR REPLACE INTO slug_redirects (old_slug, post_id) VALUES (?, ?)").bind(current.slug, id)]
      : []),
  ]);
  await replacePostTags(database, id, input.tags);
}
