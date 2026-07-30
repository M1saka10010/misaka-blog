import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const articleProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

const profileProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, {
    tagNames: ["p", "strong", "em", "del", "code", "a", "ul", "ol", "li"],
    attributes: {
      a: ["href", "title"],
    },
    protocols: {
      href: ["http", "https", "mailto"],
    },
  })
  .use(rehypeStringify);

export async function renderArticleMarkdown(markdown: string) {
  return String(await articleProcessor.process(markdown));
}

export async function renderProfileMarkdown(markdown: string) {
  return String(await profileProcessor.process(markdown));
}

export function estimateReadingMinutes(markdown: string) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#[\]()*_>~-]/g, " ");
  const chineseCharacters = plainText.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinWords = plainText.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(chineseCharacters / 400 + latinWords / 220));
}

export function extractPostSummary(markdown: string, maxLength = 100) {
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

export function resolvePostSummary(summary: string, markdown: string) {
  return summary.trim() || extractPostSummary(markdown);
}
