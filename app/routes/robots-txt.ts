import type { LoaderFunctionArgs } from "react-router";

// robots.txt 的分组是"排他"的：命中具体 User-agent 的爬虫不会再看 * 组，
// 所以每个显式放行的 AI 爬虫都必须重复一遍 Disallow，否则它会连 /admin 一起爬。
const DISALLOWED_PATHS = ["/admin", "/auth/", "/search"];

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "meta-externalagent",
  "DuckAssistBot",
];

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  const rules = ["Allow: /", ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`)].join("\n");
  const groups = ["*", ...AI_CRAWLERS].map((agent) => `User-agent: ${agent}\n${rules}`);

  const body = `# ${origin}
# 本站正文为服务端渲染的静态 HTML，欢迎答案引擎抓取与引用。

${groups.join("\n\n")}

Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
