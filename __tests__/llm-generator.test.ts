import { describe, it, expect } from "vitest";
import { generateLLMTxt, RuleBasedGenerator } from "@/lib/llm-generator";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_URL = "https://example.com";

const FULL_HTML = `
<!DOCTYPE html>
<html lang="EN">
  <head>
    <title>Example Site</title>
    <meta name="description" content="An example site for testing." />
    <meta name="keywords" content="example, test, site" />
  </head>
  <body>
    <h1>Welcome to Example</h1>
    <h2>About Us</h2>
    <h3>Our Team</h3>
    <a href="/about">About</a>
    <a href="https://external.com/page">External Link</a>
    <a href="/contact">Contact</a>
  </body>
</html>
`;

const MINIMAL_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Minimal Page</title></head>
  <body><p>Just some content.</p></body>
</html>
`;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function generate(html: string, url = BASE_URL) {
  return generateLLMTxt(url, html);
}

// ---------------------------------------------------------------------------
// extractMeta (tested via public output)
// ---------------------------------------------------------------------------

describe("extractMeta", () => {
  it("uses <title> as the document title", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toMatch(/^# Example Site/);
  });

  it('falls back to "Untitled" when <title> is missing', async () => {
    const html = `<html><head></head><body></body></html>`;
    const output = await generate(html);
    expect(output).toMatch(/^# Untitled/);
  });

  it("includes meta description as a blockquote", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toContain("> An example site for testing.");
  });

  it("falls back to og:description when meta description is absent", async () => {
    const html = `
      <html><head>
        <title>OG Page</title>
        <meta property="og:description" content="OG fallback description." />
      </head><body></body></html>
    `;
    const output = await generate(html);
    expect(output).toContain("> OG fallback description.");
  });

  it("omits the description line when no description meta is present", async () => {
    const output = await generate(MINIMAL_HTML);
    expect(output).not.toMatch(/^>/m);
  });

  it("includes keywords when present", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toContain("## Keywords");
    expect(output).toContain("example, test, site");
  });

  it("omits the Keywords section when meta keywords is absent", async () => {
    const output = await generate(MINIMAL_HTML);
    expect(output).not.toContain("## Keywords");
  });
});

// ---------------------------------------------------------------------------
// extractHeadings (tested via public output)
// ---------------------------------------------------------------------------

describe("extractHeadings", () => {
  it("maps H1 to ## in the output", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toContain("## Welcome to Example");
  });

  it("maps H2 to ### in the output", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toContain("### About Us");
  });

  it("maps H3 to #### in the output", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toContain("#### Our Team");
  });

  it("omits the Key Topics section when no headings are present", async () => {
    const output = await generate(MINIMAL_HTML);
    expect(output).not.toContain("## Key Topics");
  });

  it("skips headings that contain only whitespace", async () => {
    const html = `<html><head><title>T</title></head><body><h1>   </h1></body></html>`;
    const output = await generate(html);
    expect(output).not.toContain("## Key Topics");
  });
});

// ---------------------------------------------------------------------------
// extractLinks (tested via public output)
// ---------------------------------------------------------------------------

describe("extractLinks", () => {
  it("resolves root-relative links to absolute URLs", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toContain("[About](https://example.com/about)");
  });

  it("resolves relative paths (no leading slash) to absolute URLs", async () => {
    const html = `
      <html><head><title>T</title></head>
      <body><a href="page/detail">Detail</a></body></html>
    `;
    const output = await generate(html);
    expect(output).toContain("[Detail](https://example.com/page/detail)");
  });

  it("keeps already-absolute external links unchanged", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toContain("[External Link](https://external.com/page)");
  });

  it("skips fragment-only links (#anchor)", async () => {
    const html = `
      <html><head><title>T</title></head>
      <body><a href="#section">Jump</a></body></html>
    `;
    const output = await generate(html);
    expect(output).not.toContain("Jump");
  });

  it("skips javascript: links", async () => {
    const html = `
      <html><head><title>T</title></head>
      <body><a href="javascript:void(0)">Click</a></body></html>
    `;
    const output = await generate(html);
    expect(output).not.toContain("Click");
  });

  it("skips links with empty anchor text", async () => {
    const html = `
      <html><head><title>T</title></head>
      <body><a href="/page"></a></body></html>
    `;
    const output = await generate(html);
    expect(output).not.toContain("Site Map");
  });

  it("caps the link list at 30 entries", async () => {
    const anchors = Array.from(
      { length: 40 },
      (_, i) => `<a href="/page-${i}">Page ${i}</a>`,
    ).join("\n");
    const html = `<html><head><title>T</title></head><body>${anchors}</body></html>`;
    const output = await generate(html);
    const matches = output.match(/^- \[/gm) ?? [];
    expect(matches.length).toBe(30);
  });

  it("omits the Site Map section when no valid links are found", async () => {
    const output = await generate(MINIMAL_HTML);
    expect(output).not.toContain("## Site Map");
  });
});

// ---------------------------------------------------------------------------
// generateLLMTxt — integration
// ---------------------------------------------------------------------------

describe("generateLLMTxt", () => {
  it("produces a complete output for a full page", async () => {
    const output = await generate(FULL_HTML);
    expect(output).toMatch(/^# Example Site/);
    expect(output).toContain("> An example site for testing.");
    expect(output).toContain("## Key Topics");
    expect(output).toContain("## Site Map");
  });

  it("produces minimal output for a bare page", async () => {
    const output = await generate(MINIMAL_HTML);
    expect(output).toMatch(/^# Minimal Page/);
    expect(output).not.toContain("## Keywords");
    expect(output).not.toContain("## Key Topics");
    expect(output).not.toContain("## Site Map");
  });
});

// ---------------------------------------------------------------------------
// RuleBasedGenerator — direct usage
// ---------------------------------------------------------------------------

describe("RuleBasedGenerator", () => {
  it("can be instantiated and called directly", async () => {
    const gen = new RuleBasedGenerator();
    const output = await gen.generate(BASE_URL, FULL_HTML);
    expect(output).toMatch(/^# Example Site/);
  });

  it("handles concurrent calls independently", async () => {
    const gen = new RuleBasedGenerator();
    const htmlA = `<html><head><title>Page A</title></head><body></body></html>`;
    const htmlB = `<html><head><title>Page B</title></head><body></body></html>`;
    const [a, b] = await Promise.all([
      gen.generate(BASE_URL, htmlA),
      gen.generate(BASE_URL, htmlB),
    ]);
    expect(a).toMatch(/^# Page A/);
    expect(b).toMatch(/^# Page B/);
  });
});
