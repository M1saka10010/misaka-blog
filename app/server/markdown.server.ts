import type { Element, Nodes, Root } from "hast";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

function walkElements(node: Nodes, visit: (element: Element) => void) {
  if (node.type === "element") visit(node);
  if ("children" in node) node.children.forEach((child) => walkElements(child, visit));
}

function textContent(node: Nodes): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(textContent).join("");
  return "";
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

// 在 sanitize 之后运行：为标题注入锚点、外链新标签标记、代码块复制按钮
function rehypeArticleEnhancements() {
  return (tree: Root) => {
    const usedIds = new Set<string>();

    walkElements(tree, (element) => {
      if (["h2", "h3", "h4"].includes(element.tagName)) {
        const base = slugifyHeading(textContent(element)) || "section";
        let id = base;
        let suffix = 2;
        while (usedIds.has(id)) id = `${base}-${suffix++}`;
        usedIds.add(id);
        element.properties = { ...element.properties, id };
        element.children.push({
          type: "element",
          tagName: "a",
          properties: { className: ["heading-anchor"], href: `#${id}`, ariaLabel: "链接到本节", tabIndex: -1 },
          children: [{ type: "text", value: "#" }],
        });
      }
      if (element.tagName === "a") {
        const href = String(element.properties?.href ?? "");
        if (/^https?:\/\//.test(href)) {
          element.properties = {
            ...element.properties,
            className: ["external-link"],
            target: "_blank",
            rel: ["noopener", "noreferrer"],
          };
        }
      }
    });

    const wrapPre = (parent: Root | Element) => {
      parent.children = parent.children.map((child) => {
        if (child.type === "element" && child.tagName === "pre") {
          const wrapper: Element = {
            type: "element",
            tagName: "div",
            properties: { className: ["code-block"] },
            children: [
              child,
              {
                type: "element",
                tagName: "button",
                properties: { className: ["code-copy"], type: "button" },
                children: [{ type: "text", value: "复制" }],
              },
            ],
          };
          return wrapper;
        }
        if (child.type === "element") wrapPre(child);
        return child;
      }) as unknown as typeof parent.children;
    };
    wrapPre(tree);
  };
}

const articleProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeArticleEnhancements)
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
  if (!markdown.trim()) return "";
  // 渲染管线版本标记：读取端发现标记缺失时自动重渲染，历史文章零迁移获得增强
  return `${String(await articleProcessor.process(markdown))}\n<!-- rv:${RENDER_VERSION} -->`;
}

export const RENDER_VERSION = "2";
export const RENDER_MARKER = `<!-- rv:${RENDER_VERSION} -->`;

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
