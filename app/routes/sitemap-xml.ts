import type { LoaderFunctionArgs } from "react-router";

import { postPath, tagPath } from "~/lib/site-urls";
import { getDatabase } from "~/server/database.server";
import { getAllArchiveMonths, getAllTags, getPublishedPostIndex } from "~/server/db/public";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// published_at 是 ISO、updated_at 是 D1 的 "YYYY-MM-DD HH:MM:SS"，两者前 10 位都是日期
function lastmod(value: string | undefined): string {
  return value ? `<lastmod>${value.slice(0, 10)}</lastmod>` : "";
}

function entry(url: string, updated?: string): string {
  return `  <url><loc>${escapeXml(url)}</loc>${lastmod(updated)}</url>`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDatabase();
  const origin = new URL(request.url).origin;
  const [posts, tags, months] = await Promise.all([
    getPublishedPostIndex(db),
    getAllTags(db),
    getAllArchiveMonths(db),
  ]);

  // 文章按发布时间倒序，因此每个 "YYYY-MM" 第一次出现的就是该月最新一篇
  const monthUpdated = new Map<string, string>();
  for (const post of posts) {
    const key = post.publishedAt.slice(0, 7);
    if (!monthUpdated.has(key)) monthUpdated.set(key, post.publishedAt);
  }

  const siteUpdated = posts[0]?.publishedAt;
  // /search 是无穷组合的低价值页面，已加 noindex，不进 sitemap
  const entries = [
    entry(`${origin}/`, siteUpdated),
    entry(`${origin}/tags`, siteUpdated),
    entry(`${origin}/archive`, siteUpdated),
    entry(`${origin}/friends`),
    ...posts.map((post) => entry(`${origin}${postPath(post.slug)}`, post.updatedAt)),
    ...tags.map((tag) => entry(`${origin}${tagPath(tag.slug)}`)),
    ...months.map(({ year, month }) =>
      entry(`${origin}/archive/${year}/${month}`, monthUpdated.get(`${year}-${String(month).padStart(2, "0")}`)),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
