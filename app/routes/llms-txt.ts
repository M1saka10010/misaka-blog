import type { LoaderFunctionArgs } from "react-router";

import { postPath } from "~/lib/site-urls";
import { getDatabase } from "~/server/database.server";
import { getPublishedPostIndex, getSiteSettings } from "~/server/db/public";

// llms.txt 是 Markdown：把换行和方括号压平，避免标题/摘要破坏列表语法
function inline(value: string): string {
  return value.replace(/\s+/gu, " ").replaceAll("[", "（").replaceAll("]", "）").trim();
}

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  const db = getDatabase();
  const [settings, posts] = await Promise.all([getSiteSettings(db), getPublishedPostIndex(db)]);
  const latest = posts[0]?.publishedAt.slice(0, 10);
  const author = settings.githubUrl || settings.email;

  const lines = [
    `# ${inline(settings.siteTitle)}`,
    "",
    `> ${inline(settings.siteDescription)}`,
    "",
    `本站是个人技术博客，正文为服务端渲染的纯 HTML（无需执行 JavaScript），语言 zh-CN，可直接抓取与引用。最新文章发布于 ${latest ?? "暂无"}。`,
    "",
    "## 站点信息",
    "",
    `- 首页：${origin}/`,
    `- 文章归档：${origin}/archive`,
    `- 全部标签：${origin}/tags`,
    `- 全文检索：${origin}/search?q={关键词}`,
    `- RSS：${origin}/feed.xml`,
    `- Sitemap：${origin}/sitemap.xml`,
    ...(author ? [`- 作者：${author}`] : []),
    "",
    `## 文章（${posts.length} 篇，按发布时间倒序）`,
    "",
    ...posts.map((post) => {
      const tags = post.tags.length ? `（标签：${post.tags.map((tag) => tag.name).join("、")}）` : "";
      const summary = post.summary ? `：${inline(post.summary)}` : "";
      return `- [${inline(post.title)}](${origin}${postPath(post.slug)})${tags}${summary}`;
    }),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
