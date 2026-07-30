import type { ArchiveMonth, PublicTag, SiteSettings } from "~/server/db/public";

export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export interface PublicLayoutData {
  settings: SiteSettings;
  popularTags: PublicTag[];
  recentArchive: ArchiveMonth[];
  timeZone: string;
}

interface RouteMatchWithLoaderData {
  loaderData: unknown;
}

export function getSiteTitleFromMatches(matches: readonly RouteMatchWithLoaderData[]) {
  for (const match of matches) {
    const data = match.loaderData as Partial<PublicLayoutData> | undefined;
    if (data?.settings?.siteTitle) return data.settings.siteTitle;
  }
  return "MISAKA.LOG";
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
