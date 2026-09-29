import type { MetaDescriptor } from "react-router";

import { getSiteOriginFromMatches, getSiteSettingsFromMatches, type RouteMatchWithLoaderData } from "~/lib/public-context";
import { absoluteUrl } from "~/lib/site-urls";
import { buildSiteGraph } from "~/lib/structured-data";

// React Router 8 的 <Meta> 是"叶子覆盖"语义而非逐层合并：
// react-router/dist/*/lib/dom/ssr/components.js 里每轮循环执行 meta = [...routeMeta]，
// 子路由一旦定义 meta，父路由的 meta 会被整体丢弃（没有 meta 的路由才继承上一层）。
// 因此站点级描述符不能挂在 layout 路由上，必须由每个公开页面自行拼到自己的 meta 里，
// 否则 og:site_name、theme-color 与站点知识图在子页面上全部消失。
export function siteMeta(matches: readonly RouteMatchWithLoaderData[]): MetaDescriptor[] {
  const settings = getSiteSettingsFromMatches(matches);
  const origin = getSiteOriginFromMatches(matches);
  const siteTitle = settings?.siteTitle ?? "MISAKA.LOG";
  const ogImage = settings?.backgroundUrl ? absoluteUrl(origin, settings.backgroundUrl) : "";

  return [
    { name: "theme-color", content: "#f7f8fc", media: "(prefers-color-scheme: light)" },
    { name: "theme-color", content: "#0d0f16", media: "(prefers-color-scheme: dark)" },
    { property: "og:site_name", content: siteTitle },
    { property: "og:locale", content: "zh_CN" },
    // 没有配图时不能宣称 summary_large_image，否则卡片会退化成无图的空卡片
    { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
    ...(ogImage
      ? [
          { property: "og:image", content: ogImage },
          { property: "og:image:alt", content: siteTitle },
          { name: "twitter:image", content: ogImage },
        ]
      : []),
    ...(settings && origin ? [{ "script:ld+json": buildSiteGraph(origin, settings) }] : []),
  ];
}
