import * as cheerio from "cheerio";
import { Element } from "domhandler";

// Extracts structured content from HTML using CSS selectors — no LLM required.
export class RuleBasedGenerator {
  private $!: cheerio.CheerioAPI;

  async generate(url: string, html: string): Promise<string> {
    this.$ = cheerio.load(html);
    const baseUrl = new URL(url).origin;

    const { title, description, keywords } = this.extractMeta();
    const headings = this.extractHeadings();
    const links = this.extractLinks(baseUrl);

    return this.assemble({ title, description, keywords, headings, links });
  }

  // Reads <title> and common <meta> tags for page identity.
  private extractMeta() {
    const title = this.$("title").first().text().trim() || "Untitled";
    const description =
      this.$('meta[name="description"]').attr("content")?.trim() ||
      this.$('meta[property="og:description"]').attr("content")?.trim() ||
      "";
    const keywords =
      this.$('meta[name="keywords"]').attr("content")?.trim() || "";
    return { title, description, keywords };
  }

  // Collects H1–H3 headings, indented by +1 so H1 → ## (# is reserved for the title).
  private extractHeadings(): string[] {
    const headings: string[] = [];
    this.$("h1, h2, h3").each((_, el) => {
      const tag = (el as Element).tagName.toLowerCase();
      const text = this.$(el).text().trim();
      if (text) {
        const level = parseInt(tag[1]);
        headings.push(`${"#".repeat(level + 1)} ${text}`);
      }
    });
    return headings;
  }

  // Resolves all anchor links to absolute URLs, skipping fragments and JS links. Capped at 30.
  private extractLinks(baseUrl: string): { text: string; href: string }[] {
    const links: { text: string; href: string }[] = [];
    this.$("a[href]").each((_, el) => {
      const href = this.$(el).attr("href") ?? "";
      const text = this.$(el).text().trim();

      // Skip empty, fragment-only, or non-navigable links
      if (
        !text ||
        !href ||
        href.startsWith("#") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      // Normalize relative paths to absolute URLs
      let fullHref = href;
      if (href.startsWith("/")) {
        fullHref = baseUrl + href;
      } else if (!href.startsWith("http")) {
        fullHref = baseUrl + "/" + href;
      }

      if (links.length < 30) links.push({ text, href: fullHref });
    });
    return links;
  }

  // Combines extracted data into the llm.txt markdown format.
  private assemble({
    title,
    description,
    keywords,
    headings,
    links,
  }: {
    title: string;
    description: string;
    keywords: string;
    headings: string[];
    links: { text: string; href: string }[];
  }): string {
    const sections: string[] = [`# ${title}`];

    if (description) sections.push(`> ${description}`);
    if (keywords) sections.push(`\n## Keywords\n${keywords}`);
    if (headings.length > 0)
      sections.push(`\n## Key Topics\n${headings.join("\n")}`);
    if (links.length > 0) {
      const linkList = links.map((l) => `- [${l.text}](${l.href})`).join("\n");
      sections.push(`\n## Site Map\n${linkList}`);
    }

    return sections.join("\n");
  }
}

const defaultGenerator = new RuleBasedGenerator();

// Public entry point — accepts an optional custom generator for DI/testing.
export async function generateLLMTxt(
  url: string,
  html: string,
  generator = defaultGenerator,
): Promise<string> {
  return generator.generate(url, html);
}
