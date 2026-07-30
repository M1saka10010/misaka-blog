import { describe, expect, it } from "vitest";
import { resolvePublicOrigin } from "./auth.server";

describe("认证公开站点地址", () => {
  const proxiedRequest = new Request("https://misaka-blog.example.workers.dev/auth/github");

  it("反向代理时优先使用固定公开地址", () => {
    expect(resolvePublicOrigin(proxiedRequest, "https://blog.example.com"))
      .toBe("https://blog.example.com");
  });

  it("未配置时回退到请求 Origin", () => {
    expect(resolvePublicOrigin(proxiedRequest)).toBe("https://misaka-blog.example.workers.dev");
  });

  it("拒绝带路径或账户信息的地址", async () => {
    for (const invalidUrl of [
      "https://blog.example.com/base",
      "https://user:secret@blog.example.com",
    ]) {
      let response: Response | undefined;
      try {
        resolvePublicOrigin(proxiedRequest, invalidUrl);
      } catch (error) {
        if (error instanceof Response) response = error;
      }
      expect(response?.status).toBe(503);
      await expect(response?.text()).resolves.toContain("PUBLIC_SITE_URL 必须是仅包含协议和域名的站点地址");
    }
  });
});
