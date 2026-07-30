import { resolvePostSummary } from "~/server/markdown.server";

export const POSTS_PER_PAGE = 8;

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  faviconUrl: string;
  avatarUrl: string;
  profileHandle: string;
  profileRenderedHtml: string;
  backgroundUrl: string;
  backgroundPositionX: number;
  backgroundPositionY: number;
  mobileBackgroundPositionX: number;
  mobileBackgroundPositionY: number;
  backgroundOverlay: number;
  githubUrl: string;
  email: string;
  themeMode: "system" | "light" | "dark";
}

export interface PublicTag {
  name: string;
  slug: string;
  postCount: number;
}

export interface ArchiveMonth {
  year: number;
  month: number;
  postCount: number;
}

export interface PostSummary {
  title: string;
  slug: string;
  summary: string;
  readingMinutes: number;
  publishedAt: string;
  tags: PublicTag[];
}

export interface PublicPost extends PostSummary {
  renderedHtml: string;
}

export interface PaginatedPosts {
  posts: PostSummary[];
  page: number;
  totalPages: number;
  totalPosts: number;
}

interface SiteSettingsRow {
  site_title: string;
  site_description: string;
  favicon_url: string;
  avatar_url: string;
  profile_handle: string;
  profile_rendered_html: string;
  background_url: string;
  background_position_x: number;
  background_position_y: number;
  mobile_background_position_x: number;
  mobile_background_position_y: number;
  background_overlay: number;
  github_url: string;
  email: string;
  theme_mode: SiteSettings["themeMode"];
}

interface TagRow {
  name: string;
  slug: string;
  post_count: number;
}

interface ArchiveRow {
  year: string;
  month: string;
  post_count: number;
}

interface PostRow {
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  reading_minutes: number;
  published_at: string;
  tag_data: string | null;
}

interface PostDetailRow extends PostRow {
  rendered_html: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "MISAKA.LOG",
  siteDescription: "记录代码、生活，以及偶尔出现的二次元观察。",
  faviconUrl: "",
  avatarUrl: "",
  profileHandle: "",
  profileRenderedHtml: "",
  backgroundUrl: "",
  backgroundPositionX: 50,
  backgroundPositionY: 50,
  mobileBackgroundPositionX: 50,
  mobileBackgroundPositionY: 30,
  backgroundOverlay: 48,
  githubUrl: "",
  email: "",
  themeMode: "system",
};

const POST_SELECT = `
  SELECT
    p.title,
    p.slug,
    p.summary,
    p.markdown,
    p.reading_minutes,
    p.published_at,
    (
      SELECT group_concat(t.name || char(31) || t.slug, char(30))
      FROM post_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id
      ORDER BY t.name COLLATE NOCASE
    ) AS tag_data
  FROM posts p
`;

function mapSettings(row: SiteSettingsRow | null): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;

  return {
    siteTitle: row.site_title,
    siteDescription: row.site_description,
    faviconUrl: row.favicon_url,
    avatarUrl: row.avatar_url,
    profileHandle: row.profile_handle,
    profileRenderedHtml: row.profile_rendered_html,
    backgroundUrl: row.background_url,
    backgroundPositionX: row.background_position_x,
    backgroundPositionY: row.background_position_y,
    mobileBackgroundPositionX: row.mobile_background_position_x,
    mobileBackgroundPositionY: row.mobile_background_position_y,
    backgroundOverlay: row.background_overlay,
    githubUrl: row.github_url,
    email: row.email,
    themeMode: row.theme_mode,
  };
}

function parseTags(value: string | null): PublicTag[] {
  if (!value) return [];

  return value.split(String.fromCharCode(30)).flatMap((entry) => {
    const [name, slug] = entry.split(String.fromCharCode(31));
    return name && slug ? [{ name, slug, postCount: 0 }] : [];
  });
}

function mapPost(row: PostRow): PostSummary {
  return {
    title: row.title,
    slug: row.slug,
    summary: resolvePostSummary(row.summary, row.markdown),
    readingMinutes: row.reading_minutes,
    publishedAt: row.published_at,
    tags: parseTags(row.tag_data),
  };
}

function normalizePage(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

async function getPaginatedPosts(
  db: D1Database,
  whereSql: string,
  bindings: unknown[],
  requestedPage: number,
  orderSql = "p.published_at DESC, p.id DESC",
): Promise<PaginatedPosts> {
  const countRow = await db
    .prepare(`SELECT COUNT(*) AS count FROM posts p ${whereSql}`)
    .bind(...bindings)
    .first<{ count: number }>();
  const totalPosts = countRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
  const page = Math.min(normalizePage(requestedPage), totalPages);
  const offset = (page - 1) * POSTS_PER_PAGE;
  const result = await db
    .prepare(`${POST_SELECT} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`)
    .bind(...bindings, POSTS_PER_PAGE, offset)
    .all<PostRow>();

  return {
    posts: result.results.map(mapPost),
    page,
    totalPages,
    totalPosts,
  };
}

export async function getSiteSettings(db: D1Database): Promise<SiteSettings> {
  const row = await db.prepare("SELECT * FROM site_settings WHERE id = 1").first<SiteSettingsRow>();
  return mapSettings(row);
}

export async function getPopularTags(db: D1Database, limit = 8): Promise<PublicTag[]> {
  const result = await db
    .prepare(`
      SELECT t.name, t.slug, COUNT(p.id) AS post_count
      FROM tags t
      JOIN post_tags pt ON pt.tag_id = t.id
      JOIN posts p ON p.id = pt.post_id AND p.status = 'published'
      GROUP BY t.id
      ORDER BY post_count DESC, t.name COLLATE NOCASE
      LIMIT ?
    `)
    .bind(limit)
    .all<TagRow>();

  return result.results.map((row) => ({
    name: row.name,
    slug: row.slug,
    postCount: row.post_count,
  }));
}

export async function getAllTags(db: D1Database): Promise<PublicTag[]> {
  return getPopularTags(db, 500);
}

export async function getArchiveMonths(db: D1Database, limit = 8): Promise<ArchiveMonth[]> {
  const result = await db
    .prepare(`
      SELECT
        strftime('%Y', published_at) AS year,
        strftime('%m', published_at) AS month,
        COUNT(*) AS post_count
      FROM posts
      WHERE status = 'published' AND published_at IS NOT NULL
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<ArchiveRow>();

  return result.results.map((row) => ({
    year: Number(row.year),
    month: Number(row.month),
    postCount: row.post_count,
  }));
}

export async function getAllArchiveMonths(db: D1Database): Promise<ArchiveMonth[]> {
  return getArchiveMonths(db, 500);
}

export function getPublishedPosts(db: D1Database, page: number): Promise<PaginatedPosts> {
  return getPaginatedPosts(db, "WHERE p.status = 'published'", [], page);
}

export function getPostsByTag(
  db: D1Database,
  tagSlug: string,
  page: number,
): Promise<PaginatedPosts> {
  return getPaginatedPosts(
    db,
    `WHERE p.status = 'published' AND EXISTS (
      SELECT 1 FROM post_tags filtered_pt
      JOIN tags filtered_tag ON filtered_tag.id = filtered_pt.tag_id
      WHERE filtered_pt.post_id = p.id AND filtered_tag.slug = ?
    )`,
    [tagSlug],
    page,
  );
}

export function getPostsByMonth(
  db: D1Database,
  year: number,
  month: number,
  page: number,
): Promise<PaginatedPosts> {
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;
  return getPaginatedPosts(
    db,
    "WHERE p.status = 'published' AND strftime('%Y-%m', p.published_at) = ?",
    [monthValue],
    page,
  );
}

export async function getTagBySlug(db: D1Database, slug: string): Promise<PublicTag | null> {
  const row = await db
    .prepare(`
      SELECT t.name, t.slug, COUNT(p.id) AS post_count
      FROM tags t
      LEFT JOIN post_tags pt ON pt.tag_id = t.id
      LEFT JOIN posts p ON p.id = pt.post_id AND p.status = 'published'
      WHERE t.slug = ?
      GROUP BY t.id
    `)
    .bind(slug)
    .first<TagRow>();

  return row ? { name: row.name, slug: row.slug, postCount: row.post_count } : null;
}

export async function getPostBySlug(db: D1Database, slug: string): Promise<PublicPost | null> {
  const row = await db
    .prepare(`${POST_SELECT.replace("p.title,", "p.rendered_html, p.title,")} WHERE p.status = 'published' AND p.slug = ? LIMIT 1`)
    .bind(slug)
    .first<PostDetailRow>();

  return row ? { ...mapPost(row), renderedHtml: row.rendered_html } : null;
}

function buildFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 8)
    .map((term) => `"${term.replaceAll('"', '""')}"`)
    .join(" AND ");
}

export function searchPublishedPosts(
  db: D1Database,
  query: string,
  page: number,
): Promise<PaginatedPosts> {
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) {
    return Promise.resolve({ posts: [], page: 1, totalPages: 1, totalPosts: 0 });
  }

  const whereSql = `WHERE p.status = 'published' AND p.id IN (
    SELECT rowid FROM posts_fts WHERE posts_fts MATCH ?
  )`;
  return getPaginatedPosts(db, whereSql, [ftsQuery], page);
}
