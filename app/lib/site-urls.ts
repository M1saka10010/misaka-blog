// 站点内绝对 URL 的唯一出口：canonical、JSON-LD、llms.txt、sitemap 都从这里取，避免各处拼串不一致
export function absoluteUrl(origin: string, value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (!value) return origin;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

export function postPath(slug: string): string {
  return `/posts/${encodeURIComponent(slug)}`;
}

export function postUrl(origin: string, slug: string): string {
  return absoluteUrl(origin, postPath(slug));
}

export function tagPath(slug: string): string {
  return `/tags/${encodeURIComponent(slug)}`;
}

export function tagUrl(origin: string, slug: string): string {
  return absoluteUrl(origin, tagPath(slug));
}

// 首页以外的分页用自指 canonical，避免 ?page=2 被当成首页重复内容
export function canonicalUrl(origin: string, pathname: string, page?: number): string {
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return absoluteUrl(origin, page && page > 1 ? `${normalized}?page=${page}` : normalized);
}
