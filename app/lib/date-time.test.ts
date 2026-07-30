import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./date-time";

describe("数据库时间格式化", () => {
  it("将 D1 CURRENT_TIMESTAMP 视为 UTC 并转换到指定时区", () => {
    expect(formatDateTime("2026-07-30 06:30:00", "Asia/Shanghai")).toBe("2026-07-30 14:30");
  });

  it("转换带 Z 的 ISO 时间", () => {
    expect(formatDateTime("2026-07-30T16:30:00.000Z", "Asia/Shanghai")).toBe("2026-07-31 00:30");
    expect(formatDate("2026-07-30T16:30:00.000Z", "Asia/Shanghai")).toBe("2026-07-31");
  });

  it("无法解析时保留原值", () => {
    expect(formatDateTime("未知时间", "Asia/Shanghai")).toBe("未知时间");
  });
});
