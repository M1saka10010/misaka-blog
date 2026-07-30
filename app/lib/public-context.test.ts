import { describe, expect, it } from "vitest";

import { DEFAULT_TIME_ZONE, normalizeTimeZone } from "./public-context";

describe("normalizeTimeZone", () => {
  it("保留有效的 IANA 时区", () => {
    expect(normalizeTimeZone("America/New_York")).toBe("America/New_York");
  });

  it("为空值或无效时区提供默认值", () => {
    expect(normalizeTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone("Invalid/TimeZone")).toBe(DEFAULT_TIME_ZONE);
  });
});
