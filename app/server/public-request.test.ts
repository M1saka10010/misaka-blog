import { describe, expect, it } from "vitest";

import { resolvePublicRequest } from "./public-request.server";

describe("反向代理公开请求地址", () => {
  it("使用 PUBLIC_SITE_URL 恢复公开域名并保留路径和查询", () => {
    const request = new Request("https://misaka-blog.example.workers.dev/admin/posts/41/edit.data?saved=1", {
      method: "POST",
      headers: { Origin: "https://blog.example.com" },
      body: "title=test",
    });

    const publicRequest = resolvePublicRequest(request, "https://blog.example.com");

    expect(publicRequest.url).toBe("https://blog.example.com/admin/posts/41/edit.data?saved=1");
    expect(publicRequest.headers.get("Origin")).toBe("https://blog.example.com");
  });

  it("未配置或配置无效时保留原请求", () => {
    const request = new Request("https://worker.example.dev/admin/posts/41/edit.data");
    expect(resolvePublicRequest(request)).toBe(request);
    expect(resolvePublicRequest(request, "not-a-url")).toBe(request);
  });

  it("公开域名已经一致时不复制请求", () => {
    const request = new Request("https://blog.example.com/admin/posts/41/edit.data");
    expect(resolvePublicRequest(request, "https://blog.example.com")).toBe(request);
  });
});
