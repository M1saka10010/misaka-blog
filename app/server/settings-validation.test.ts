import { describe, expect, it } from "vitest";
import { normalizeSettingsHttpsUrl } from "./settings-validation.server";

describe("站点设置 URL 校验", () => {
  it("允许留空", () => {
    expect(normalizeSettingsHttpsUrl("", "背景图片 URL")).toBe("");
  });

  it("规范化 HTTPS 地址", () => {
    expect(normalizeSettingsHttpsUrl(" https://example.com/image.png ", "背景图片 URL"))
      .toBe("https://example.com/image.png");
  });

  it("允许 HTTPS Favicon 地址", () => {
    expect(normalizeSettingsHttpsUrl("https://example.com/favicon.svg", "Favicon URL"))
      .toBe("https://example.com/favicon.svg");
  });

  it("返回包含字段名的格式错误", () => {
    expect(() => normalizeSettingsHttpsUrl("example.com/image.png", "背景图片 URL"))
      .toThrow("背景图片 URL格式无效");
  });

  it("拒绝 HTTP 地址并说明具体字段", () => {
    expect(() => normalizeSettingsHttpsUrl("http://example.com/avatar.png", "Avatar URL"))
      .toThrow("Avatar URL必须使用 HTTPS");
  });
});
