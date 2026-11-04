import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormatRail } from "@/components/FormatRail";

describe("FormatRail", () => {
  it("links every format to its route", () => {
    render(<FormatRail activeId="json" />);
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/json",
      "/yaml",
      "/mermaid",
      "/xml",
      "/sql",
      "/markdown",
    ]);
  });

  it("marks the active format", () => {
    render(<FormatRail activeId="sql" />);
    expect(screen.getByRole("link", { name: /SQL$/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link").filter((a) => a.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("scrolls the active format into view on mobile", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<FormatRail activeId="markdown" />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("link", { name: /Markdown$/ }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
  });

  it("is labelled as format navigation", () => {
    render(<FormatRail activeId="json" />);
    expect(screen.getByRole("navigation", { name: "Formats" })).toBeInTheDocument();
  });
});
