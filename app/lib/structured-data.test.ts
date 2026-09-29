import { describe, expect, it } from "vitest";

import { buildCollectionGraph, buildPostGraph, buildSiteGraph } from "./structured-data";
import type { PostSummary, SiteSettings } from "~/server/db/public";

const ORIGIN = "https://blog.example.com";

const settings: SiteSettings = {
  siteTitle: "MISAKA.LOG",
  siteDescription: "记录代码、生活，以及偶尔出现的二次元观察。",
  faviconUrl: "",
  avatarUrl: "",
  profileHandle: "misaka",
  profileRenderedHtml: "",
  backgroundUrl: "",
  backgroundPositionX: 50,
  backgroundPositionY: 50,
  mobileBackgroundPositionX: 50,
  mobileBackgroundPositionY: 30,
  backgroundOverlay: 48,
  backgroundColor: "",
  githubUrl: "",
  email: "",
  themeMode: "system",
};

const post: PostSummary = {
  title: "如何让博客 AEO 就绪",
  slug: "aeo-ready",
  summary: "一份 AEO 改造清单。",
  readingMinutes: 6,
  publishedAt: "2026-07-30T06:30:00.000Z",
  updatedAt: "2026-08-02 10:00:00",
  tags: [{ name: "SEO", slug: "seo", postCount: 3 }],
};

interface GraphDocument {
  "@context": string;
  "@graph": readonly { "@type"?: string }[];
}

interface WebsiteNode {
  "@id": string;
  url: string;
  inLanguage: string;
  publisher: { "@id": string };
  potentialAction: { target: { urlTemplate: string } };
}

interface ArticleNode {
  headline: string;
  datePublished: string;
  dateModified: string;
  isPartOf: { "@id": string };
  author: { "@id": string };
  mainEntityOfPage: { "@id": string };
  timeRequired: string;
  keywords?: string;
  articleSection?: string;
}

interface CollectionNode {
  "@id": string;
  mainEntity?: {
    numberOfItems: number;
    itemListElement: { position: number; name: string; url: string }[];
  };
}

function pick<T>(document: GraphDocument, type: string): T {
  const found = document["@graph"].find((entry) => entry["@type"] === type);
  if (!found) throw new Error(`缺少 ${type} 节点`);
  return found as unknown as T;
}

describe("站点级知识图", () => {
  const graph = buildSiteGraph(ORIGIN, settings);

  it("带上 @context，否则答案引擎不会把它当 schema.org 解析", () => {
    expect(graph["@context"]).toBe("https://schema.org");
  });

  it("声明站点实体并关联作者", () => {
    const website = pick<WebsiteNode>(graph, "WebSite");
    expect(website["@id"]).toBe(`${ORIGIN}/#website`);
    expect(website.url).toBe(`${ORIGIN}/`);
    expect(website.inLanguage).toBe("zh-CN");
    expect(website.publisher).toEqual({ "@id": `${ORIGIN}/#person` });
    expect(pick<{ name: string }>(graph, "Person").name).toBe("misaka");
  });

  it("暴露站内搜索入口给答案引擎", () => {
    expect(pick<WebsiteNode>(graph, "WebSite").potentialAction.target.urlTemplate).toBe(
      `${ORIGIN}/search?q={search_term_string}`,
    );
  });
});

describe("文章级知识图", () => {
  const graph = buildPostGraph(ORIGIN, settings, post);
  const article = pick<ArticleNode>(graph, "BlogPosting");

  it("把 updated_at 归一化成 ISO 8601 作为 dateModified", () => {
    expect(article.datePublished).toBe("2026-07-30T06:30:00.000Z");
    expect(article.dateModified).toBe("2026-08-02T10:00:00.000Z");
  });

  it("挂到站点与作者节点上，形成同一张图", () => {
    expect(article.isPartOf).toEqual({ "@id": `${ORIGIN}/#website` });
    expect(article.author).toEqual({ "@id": `${ORIGIN}/#person` });
    expect(article.mainEntityOfPage["@id"]).toBe(`${ORIGIN}/posts/aeo-ready`);
  });

  it("用标签填充关键词与栏目", () => {
    expect(article.keywords).toBe("SEO");
    expect(article.articleSection).toBe("SEO");
  });

  it("阅读时长转成 ISO 8601 duration", () => {
    expect(article.timeRequired).toBe("PT6M");
  });

  // 面包屑已于 AEO 复盘后移除：它的中间层只能取 post.tags[0]，
  // 而该标签实际是按 tags.id（标签创建先后）排的，作者不可控，收益又低。
  // 文章归属性由 isPartOf → WebSite 表达，不需要 BreadcrumbList。
  it("只输出 BlogPosting，不再输出 BreadcrumbList", () => {
    expect(graph["@graph"].map((node) => node["@type"])).toEqual(["BlogPosting"]);
  });

  it("标题超过 110 字符时截断", () => {
    const long = buildPostGraph(ORIGIN, settings, { ...post, title: "长".repeat(150) });
    expect(pick<ArticleNode>(long, "BlogPosting").headline).toHaveLength(110);
  });
});

describe("列表页知识图", () => {
  it("用 ItemList 描述页面上的文章顺序", () => {
    const graph = buildCollectionGraph({
      origin: ORIGIN,
      path: "/tags/seo",
      name: "#SEO",
      description: "共 1 篇",
      posts: [post],
    });
    const page = pick<CollectionNode>(graph, "CollectionPage");

    expect(page["@id"]).toBe(`${ORIGIN}/tags/seo`);
    expect(page.mainEntity?.numberOfItems).toBe(1);
    expect(page.mainEntity?.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: post.title,
      url: `${ORIGIN}/posts/aeo-ready`,
    });
  });

  it("空列表不产生空的 ItemList", () => {
    const graph = buildCollectionGraph({ origin: ORIGIN, path: "/tags", name: "全部标签", description: "x" });
    expect(pick<CollectionNode>(graph, "CollectionPage").mainEntity).toBeUndefined();
  });
});
