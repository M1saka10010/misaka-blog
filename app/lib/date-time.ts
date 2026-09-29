function parseDatabaseDateTime(value: string): Date {
  const normalizedValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  return new Date(normalizedValue);
}

export function formatDateTime(value: string, timeZone: string): string {
  const date = parseDatabaseDateTime(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date).replaceAll("/", "-");
}

// 结构化数据要求 ISO 8601：把 D1 的 "YYYY-MM-DD HH:MM:SS" 归一化后再输出
export function toIsoDateTime(value: string): string {
  const date = parseDatabaseDateTime(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

// 一天以内的编辑多半是错别字修正，"更新于"只在实质性改动后才出现，避免噪音
export function isUpdatedLater(publishedAt: string, updatedAt: string, thresholdHours = 24): boolean {
  const published = parseDatabaseDateTime(publishedAt).getTime();
  const updated = parseDatabaseDateTime(updatedAt).getTime();
  if (Number.isNaN(published) || Number.isNaN(updated)) return false;
  return updated - published > thresholdHours * 3_600_000;
}

function formatYearMonthDay(value: string, timeZone: string): string | null {
  const date = parseDatabaseDateTime(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

export function formatDate(value: string, timeZone: string): string {
  return formatYearMonthDay(value, timeZone)?.replaceAll("/", "-") ?? value;
}

// 文章列表与正文头部的日期样式（2026.08.25）
export function formatDottedDate(value: string, timeZone: string): string {
  return formatYearMonthDay(value, timeZone)?.replaceAll("/", ".") ?? value;
}
