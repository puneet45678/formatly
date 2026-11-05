import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site";

describe("siteUrl", () => {
  it("is null when not configured", () => {
    expect(siteUrl(undefined)).toBeNull();
    expect(siteUrl("")).toBeNull();
  });

  it("drops a trailing slash and keeps a base path", () => {
    expect(siteUrl("https://formatly.dev/")).toBe("https://formatly.dev");
    expect(siteUrl("https://example.com/tools/formatly/")).toBe("https://example.com/tools/formatly");
  });

  it("rejects values that aren't http(s) URLs instead of publishing them", () => {
    expect(siteUrl("formatly.dev")).toBeNull();
    expect(siteUrl("javascript:alert(1)")).toBeNull();
    expect(siteUrl("ftp://formatly.dev")).toBeNull();
  });
});
