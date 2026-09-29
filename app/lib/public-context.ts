import type { ArchiveMonth, PublicTag, SiteSettings } from "~/server/db/public";

export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export interface PublicLayoutData {
  settings: SiteSettings;
  popularTags: PublicTag[];
  recentArchive: ArchiveMonth[];
  timeZone: string;
}

export interface RouteMatchWithLoaderData {
  loaderData: unknown;
}

export function getSiteSettingsFromMatches(matches: readonly RouteMatchWithLoaderData[]): SiteSettings | null {
  for (const match of matches) {
    const data = match.loaderData as Partial<PublicLayoutData> | undefined;
    if (data?.settings?.siteTitle) return data.settings;
  }
  return null;
}

export function getSiteTitleFromMatches(matches: readonly RouteMatchWithLoaderData[]) {
  return getSiteSettingsFromMatches(matches)?.siteTitle ?? "MISAKA.LOG";
}

// 根路由把公开域名（已由 PUBLIC_SITE_URL 还原）放进 loaderData，供 canonical 与 JSON-LD 使用
export function getSiteOriginFromMatches(matches: readonly RouteMatchWithLoaderData[]) {
  for (const match of matches) {
    const origin = (match.loaderData as { siteOrigin?: string } | undefined)?.siteOrigin;
    if (origin) return origin.replace(/\/+$/, "");
  }
  return "";
}

export function normalizeTimeZone(value: string | undefined): string {
  const timeZone = value?.trim() || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone }).format();
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function readPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get("page") ?? "1");
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
