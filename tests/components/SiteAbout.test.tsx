import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SiteAbout } from "@/components/SiteAbout";
import { ABOUT } from "@/content/site";

describe("SiteAbout", () => {
  it("has the title as an h2, then 'What it does' and 'Questions' as h3, in order", () => {
    render(<SiteAbout />);
    const headings = screen.getAllByRole("heading").map((h) => [h.tagName, h.textContent]);
    expect(headings).toEqual([
      ["H2", ABOUT.title],
      ["H3", ABOUT.heading.features],
      ["H3", ABOUT.heading.questions],
    ]);
  });

  it("lists every feature", () => {
    render(<SiteAbout />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(ABOUT.features.length);
    for (const [i, feature] of ABOUT.features.entries()) {
      expect(items[i]).toHaveTextContent(feature.lead);
      expect(items[i]).toHaveTextContent(feature.text);
    }
  });

  it("has every question with its answer in the page, even before it is opened", () => {
    const { container } = render(<SiteAbout />);
    for (const { question, answer } of ABOUT.questions) {
      expect(screen.getByText(question)).toBeInTheDocument();
      expect(container).toHaveTextContent(answer); // present in the HTML for search and screen readers
    }
  });

  it("opens and closes questions with a native disclosure, no script needed", () => {
    const { container } = render(<SiteAbout />);
    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(ABOUT.questions.length);
    for (const d of details) expect(d.open).toBe(false);
  });

  it("is a labelled region so people can jump to it", () => {
    render(<SiteAbout />);
    expect(screen.getByRole("region", { name: ABOUT.title })).toBeInTheDocument();
  });
});
