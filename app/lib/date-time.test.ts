import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatDottedDate, isUpdatedLater, toIsoDateTime } from "./date-time";

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

  it("文章列表的日期样式与正文头部保持一致", () => {
    expect(formatDottedDate("2026-07-30T16:30:00.000Z", "Asia/Shanghai")).toBe("2026.07.31");
    expect(formatDottedDate("2026-07-30 06:30:00", "Asia/Shanghai")).toBe("2026.07.30");
  });
});

describe("结构化数据的 ISO 8601 输出", () => {
  it("把 D1 的无时区时间戳按 UTC 补全", () => {
    expect(toIsoDateTime("2026-07-30 06:30:00")).toBe("2026-07-30T06:30:00.000Z");
  });

  it("已是 ISO 的输入保持等值", () => {
    expect(toIsoDateTime("2026-07-30T06:30:00.000Z")).toBe("2026-07-30T06:30:00.000Z");
  });

  it("无法解析时原样返回，不抛异常", () => {
    expect(toIsoDateTime("未知时间")).toBe("未知时间");
  });
});

describe("更新于的判定", () => {
  it("发布当天的小幅修订不展示更新时间", () => {
    expect(isUpdatedLater("2026-07-30T06:30:00.000Z", "2026-07-30 10:00:00")).toBe(false);
  });

  it("超过一天的实质性改动才展示", () => {
    expect(isUpdatedLater("2026-07-30T06:30:00.000Z", "2026-08-02 10:00:00")).toBe(true);
  });

  it("时间不可解析时不展示", () => {
    expect(isUpdatedLater("2026-07-30T06:30:00.000Z", "未知时间")).toBe(false);
  });
});
