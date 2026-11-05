import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormatGuide, formatStructuredData, jsonLd } from "@/components/FormatGuide";
import { GUIDES } from "@/content/guides";
import { FORMATS, getFormat } from "@/formats/registry";
import robots, { AI_CRAWLERS } from "@/app/robots";
import sitemap from "@/app/sitemap";
import { llmsTxt } from "@/app/llms.txt/route";

afterEach(() => vi.unstubAllEnvs());

describe("sitemap", () => {
  it("lists nothing until the site URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(sitemap()).toEqual([]);
  });

  it("lists the home page and every format page", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://formatly.dev/");
    expect(sitemap().map((e) => e.url)).toEqual(["https://formatly.dev/", ...FORMATS.map((f) => `https://formatly.dev/${f.id}`)]);
  });
});

describe("robots", () => {
  it("allows everyone, names the AI crawlers, and points at the sitemap when the URL is known", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://formatly.dev");
    const result = robots();
    expect(result.rules).toEqual([
      { userAgent: "*", allow: "/" },
      { userAgent: [...AI_CRAWLERS], allow: "/" },
    ]);
    expect(result.sitemap).toBe("https://formatly.dev/sitemap.xml");
    expect(AI_CRAWLERS).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]));
  });

  it("leaves the sitemap line out without a site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(robots().sitemap).toBeUndefined();
  });
});

describe("llms.txt", () => {
  it("names every formatter with an absolute link and its description", () => {
    const text = llmsTxt("https://formatly.dev");
    expect(text.startsWith("# formatly\n")).toBe(true);
    for (const f of FORMATS) {
      expect(text).toContain(`- [${GUIDES[f.id].title}](https://formatly.dev/${f.id}): ${GUIDES[f.id].description}`);
    }
    expect(text).toContain("Is my data sent to a server?");
  });

  it("uses relative links when the site URL isn't known", () => {
    expect(llmsTxt(null)).toContain(`(${"/json"})`);
  });
});

describe("structured data", () => {
  it("describes the tool and its questions", () => {
    const [app, faq] = formatStructuredData(getFormat("json"), "https://formatly.dev");
    expect(app).toMatchObject({ "@type": "WebApplication", url: "https://formatly.dev/json", isAccessibleForFree: true });
    expect(faq).toMatchObject({ "@type": "FAQPage" });
    expect((faq as { mainEntity: unknown[] }).mainEntity).toHaveLength(GUIDES.json.faq.length);
  });

  it("leaves the URL out when the site URL isn't known", () => {
    const [app] = formatStructuredData(getFormat("json"), null);
    expect(app).not.toHaveProperty("url");
  });

  it("can't close its script tag, whatever the text says", () => {
    const out = jsonLd({ text: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out)).toEqual({ text: "</script><script>alert(1)</script>" });
  });
});

describe("FormatGuide", () => {
  it("renders the heading, the questions and links to every other formatter", () => {
    const { container } = render(<FormatGuide format={getFormat("sql")} />);
    expect(screen.getByRole("heading", { level: 1, name: GUIDES.sql.heading })).toBeInTheDocument();
    for (const { question } of GUIDES.sql.faq) expect(screen.getByText(question)).toBeInTheDocument();
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links.sort()).toEqual(FORMATS.filter((f) => f.id !== "sql").map((f) => `/${f.id}`).sort());
    expect(container.querySelector('script[type="application/ld+json"]')).not.toBeNull();
  });
});
