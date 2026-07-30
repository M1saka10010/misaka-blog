export interface FriendLink {
  id: number;
  name: string;
  url: string;
  description: string;
  iconUrl: string;
  customIconUrl: string;
  sortOrder: number;
  isActive: boolean;
}

interface FriendLinkRow {
  id: number;
  name: string;
  url: string;
  description: string;
  icon_url: string;
  sort_order: number;
  is_active: number;
}

function mapFriendLink(row: FriendLinkRow): FriendLink {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    iconUrl: row.icon_url || getDefaultFaviconUrl(row.url),
    customIconUrl: row.icon_url,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
  };
}

export function normalizeHttpsUrl(value: string) {
  const input = value.trim();
  if (!input) throw new Error("链接地址不能为空");
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("请输入有效的链接地址");
  }
  if (url.protocol !== "https:") throw new Error("链接地址必须使用 HTTPS");
  if (url.username || url.password) throw new Error("链接地址不能包含账户信息");
  url.hash = "";
  return url.toString();
}

export function normalizeOptionalHttpsUrl(value: string) {
  return value.trim() ? normalizeHttpsUrl(value) : "";
}

export function getDefaultFaviconUrl(targetUrl: string) {
  const url = new URL(targetUrl);
  return `${url.origin}/favicon.ico`;
}

export async function listPublicFriendLinks(database: D1Database) {
  const result = await database.prepare(
    `SELECT id, name, url, description, icon_url, sort_order, is_active
     FROM friend_links
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`,
  ).all<FriendLinkRow>();
  return result.results.map(mapFriendLink);
}

export async function listAdminFriendLinks(database: D1Database) {
  const result = await database.prepare(
    `SELECT id, name, url, description, icon_url, sort_order, is_active
     FROM friend_links
     ORDER BY sort_order ASC, id ASC`,
  ).all<FriendLinkRow>();
  return result.results.map(mapFriendLink);
}
