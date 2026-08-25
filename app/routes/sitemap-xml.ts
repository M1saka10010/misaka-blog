import type { LoaderFunctionArgs } from "react-router";

import { getDatabase } from "~/server/database.server";
import { getAllArchiveMonths, getAllTags, getPublishedPostIndex } from "~/server/db/public";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDatabase();
  const origin = new URL(request.url).origin;
  const [posts, tags, months] = await Promise.all([
    getPublishedPostIndex(db),
    getAllTags(db),
    getAllArchiveMonths(db),
  ]);

  const staticPaths = ["/", "/tags", "/archive", "/friends", "/search"];
  const entries = [
    ...staticPaths.map((path) => `  <url><loc>${origin}${path}</loc></url>`),
    ...posts.map((post) => {
      const lastmod = post.publishedAt ? `<lastmod>${post.publishedAt.slice(0, 10)}</lastmod>` : "";
      return `  <url><loc>${origin}/posts/${encodeURIComponent(post.slug)}</loc>${lastmod}</url>`;
    }),
    ...tags.map((tag) => `  <url><loc>${origin}/tags/${escapeXml(encodeURIComponent(tag.slug))}</loc></url>`),
    ...months.map((month) => `  <url><loc>${origin}/archive/${month.year}/${month.month}</loc></url>`),
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
