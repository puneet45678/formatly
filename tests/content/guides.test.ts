import { describe, expect, it } from "vitest";
import { GUIDES } from "@/content/guides";
import { FORMATS } from "@/formats/registry";

describe("format guides", () => {
  it("has a guide for every format and nothing else", () => {
    expect(Object.keys(GUIDES).sort()).toEqual(FORMATS.map((f) => f.id).sort());
  });

  it.each(FORMATS.map((f) => [f.id, GUIDES[f.id]] as const))("%s: fits search result limits", (_id, guide) => {
    // Longer descriptions are cut off in search results.
    expect(guide.description.length).toBeLessThanOrEqual(160);
    expect(guide.title.length).toBeLessThanOrEqual(60);
    expect(guide.features.length).toBeGreaterThanOrEqual(3);
    expect(guide.faq.length).toBeGreaterThanOrEqual(3);
    expect(guide.aliases.length).toBeGreaterThan(0);
  });

  it("gives every page its own title and description", () => {
    const titles = FORMATS.map((f) => GUIDES[f.id].title);
    const descriptions = FORMATS.map((f) => GUIDES[f.id].description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("answers the privacy question first on every page", () => {
    for (const f of FORMATS) expect(GUIDES[f.id].faq[0].question).toBe("Is my data sent to a server?");
  });

  it("never offers tabs for YAML, matching the indent setting", () => {
    expect(GUIDES.yaml.features.join(" ")).toMatch(/2 or 4 spaces/);
  });
});
