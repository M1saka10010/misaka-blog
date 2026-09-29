import type { LoaderFunctionArgs } from "react-router";

import { toIsoDateTime } from "~/lib/date-time";
import { postPath } from "~/lib/site-urls";
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

function utcDate(value: string): string {
  const date = new Date(toIsoDateTime(value));
  return Number.isNaN(date.getTime()) ? "" : date.toUTCString();
}

export async function loader({ request }: LoaderFunctionArgs) {
  const db = getDatabase();
  const origin = new URL(request.url).origin;
  const [settings, posts] = await Promise.all([getSiteSettings(db), getPublishedPostIndex(db, 20)]);
  const creator = settings.profileHandle || settings.siteTitle;
  const lastBuildDate = posts[0] ? utcDate(posts[0].updatedAt) : "";

  const items = posts
    .map((post) => {
      const url = `${origin}${postPath(post.slug)}`;
      const categories = post.tags.map((tag) => `\n      <category>${escapeXml(tag.name)}</category>`).join("");
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${utcDate(post.publishedAt)}</pubDate>
      <dc:creator>${escapeXml(creator)}</dc:creator>
      <description>${escapeXml(post.summary)}</description>${categories}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(settings.siteTitle)}</title>
    <link>${origin}/</link>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(settings.siteDescription)}</description>
    <language>zh-CN</language>
${lastBuildDate ? `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` : ""}${items}
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
