import { describe, expect, it } from "vitest";

import { loader } from "./robots-txt";

const request = new Request("https://blog.example.com/robots.txt");

async function readRobots() {
  const response = await loader({ request } as Parameters<typeof loader>[0]);
  return response.text();
}

// robots.txt 的分组互不继承：某个爬虫只看自己那一组，所以断言必须按组切片
function groupFor(body: string, agent: string): string {
  return body.split(/\n\n+/).find((group) => group.includes(`User-agent: ${agent}\n`)) ?? "";
}

describe("robots.txt", () => {
  it("声明 sitemap 位置", async () => {
    expect(await readRobots()).toContain("Sitemap: https://blog.example.com/sitemap.xml");
  });

  it("屏蔽后台、鉴权与搜索结果页", async () => {
    const body = await readRobots();
    for (const path of ["/admin", "/auth/", "/search"]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
  });

  it("不屏蔽站点根路径", async () => {
    expect((await readRobots()).split("\n")).not.toContain("Disallow: /");
  });

  it("显式放行的 AI 爬虫分组重复了 Disallow，否则排他规则会让它爬到后台", async () => {
    const body = await readRobots();
    for (const agent of ["GPTBot", "PerplexityBot", "ClaudeBot", "OAI-SearchBot"]) {
      const group = groupFor(body, agent);
      expect(group, `${agent} 分组缺失`).not.toBe("");
      expect(group).toContain("Allow: /");
      expect(group).toContain("Disallow: /admin");
      expect(group).toContain("Disallow: /search");
    }
  });

  it("通配分组同样放行正文抓取", async () => {
    const group = groupFor(await readRobots(), "*");
    expect(group).toContain("Allow: /");
    expect(group).toContain("Disallow: /admin");
  });
});
