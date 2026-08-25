import type { LoaderFunctionArgs } from "react-router";

import { getDatabase } from "~/server/database.server";
import { getPublishedPostIndex, getSiteSettings } from "~/server/db/public";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDatabase();
  const origin = new URL(request.url).origin;
  const [settings, posts] = await Promise.all([getSiteSettings(db), getPublishedPostIndex(db, 20)]);

  const items = posts
    .map((post) => {
      const url = `${origin}/posts/${encodeURIComponent(post.slug)}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(settings.siteTitle)}</title>
    <link>${origin}/</link>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(settings.siteDescription)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
