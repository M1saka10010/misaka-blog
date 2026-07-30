import { describe, expect, it } from "vitest";
import { normalizeSlug, normalizeTagNames } from "./admin-data.server";
import { estimateReadingMinutes, extractPostSummary, renderArticleMarkdown, renderProfileMarkdown, resolvePostSummary } from "./markdown.server";

describe("内容工具", () => {
  it("规范化文章 Slug", () => {
    expect(normalizeSlug("  Cloudflare Workers + D1 入门  ")).toBe("cloudflare-workers-d1-入门");
  });

  it("去重并清理标签", () => {
    expect(normalizeTagNames("Cloudflare, D1，Cloudflare,  前端 ")).toEqual(["Cloudflare", "D1", "前端"]);
    expect(normalizeTagNames([" Cloudflare ", "D1", "Cloudflare", ""])).toEqual(["Cloudflare", "D1"]);
  });

  it("阅读时长至少为一分钟", () => {
    expect(estimateReadingMinutes("很短的文章")).toBe(1);
  });

  it("摘要为空时提取正文前 100 个纯文本字符", () => {
    const markdown = `# 标题\n\n这是一个[链接](https://example.com)，还有 **重点内容**。\n\n\`行内代码\`\n\n\`\`\`js\nalert(1)\n\`\`\``;
    expect(extractPostSummary(markdown)).toBe("标题 这是一个链接，还有 重点内容。 行内代码");
    expect(extractPostSummary("中".repeat(120))).toHaveLength(100);
  });

  it("优先使用单独设置的摘要", () => {
    expect(resolvePostSummary(" 手写摘要 ", "正文内容")).toBe("手写摘要");
    expect(resolvePostSummary("", "# 标题\n\n正文内容")).toBe("标题 正文内容");
  });

  it("过滤文章中的危险 HTML", async () => {
    const html = await renderArticleMarkdown("正文<script>alert(1)</script>\n\n[危险](javascript:alert(1))");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });

  it("个人简介不允许图片与标题", async () => {
    const html = await renderProfileMarkdown("# 标题\n\n![头像](https://example.com/avatar.png)\n\n**简介**");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<img");
    expect(html).toContain("<strong>简介</strong>");
  });
});
