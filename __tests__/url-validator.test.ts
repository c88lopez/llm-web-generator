import { describe, it, expect } from "vitest";
import { validateUrl, urlSchema } from "@/lib/url-validator";

describe("urlSchema", () => {
  it("accepts https URLs", () => {
    expect(urlSchema.safeParse("https://example.com").success).toBe(true);
  });

  it("accepts http URLs with path and query", () => {
    expect(
      urlSchema.safeParse("http://sub.domain.co.uk/path?q=1").success,
    ).toBe(true);
  });

  it("rejects ftp protocol", () => {
    expect(urlSchema.safeParse("ftp://example.com").success).toBe(false);
  });

  it("rejects bare domain without protocol", () => {
    expect(urlSchema.safeParse("example.com").success).toBe(false);
  });

  it("rejects non-URL string", () => {
    expect(urlSchema.safeParse("not-a-url").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(urlSchema.safeParse("").success).toBe(false);
  });
});

describe("validateUrl", () => {
  it("returns success with url for valid input", () => {
    const result = validateUrl("https://example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.url).toBe("https://example.com");
    }
  });

  it("returns error for invalid input", () => {
    const result = validateUrl("not-a-url");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it("returns error for ftp protocol", () => {
    const result = validateUrl("ftp://example.com");
    expect(result.success).toBe(false);
  });
});
