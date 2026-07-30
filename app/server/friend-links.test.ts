import { describe, expect, it } from "vitest";
import { getDefaultFaviconUrl, normalizeHttpsUrl, normalizeOptionalHttpsUrl } from "./friend-links.server";

describe("友情链接 URL", () => {
  it("根据目标站点根地址生成 favicon", () => {
    expect(getDefaultFaviconUrl("https://example.com/path?q=1")).toBe("https://example.com/favicon.ico");
  });

  it("清理 hash 并保留目标路径", () => {
    expect(normalizeHttpsUrl("https://example.com/blog/#about")).toBe("https://example.com/blog/");
  });

  it("拒绝非 HTTPS 地址", () => {
    expect(() => normalizeHttpsUrl("http://example.com")).toThrow("必须使用 HTTPS");
  });

  it("拒绝包含账户信息的地址", () => {
    expect(() => normalizeHttpsUrl("https://user:secret@example.com")).toThrow("不能包含账户信息");
  });

  it("允许自定义图标留空", () => {
    expect(normalizeOptionalHttpsUrl("  ")).toBe("");
  });
});
