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

  it("offers a collapse button when expanded", async () => {
    const onToggle = vi.fn();
    render(<FormatRail activeId="json" collapsed={false} onToggle={onToggle} />);
    const toggle = screen.getByRole("button", { name: "Collapse format menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    toggle.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("offers an expand button when collapsed", () => {
    render(<FormatRail activeId="json" collapsed onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Expand format menu" })).toHaveAttribute("aria-expanded", "false");
  });

  // jsdom can't apply CSS, so these check the classes that hide or show names.
  it("closed: names are for screen readers, with a hover/focus pill", () => {
    render(<FormatRail activeId="json" collapsed onToggle={() => {}} />);
    const yaml = screen.getByRole("link", { name: "YAML" });
    const name = yaml.querySelector("[data-name]")!;
    expect(name).toHaveClass("sr-only");
    expect(name).not.toHaveClass("md:not-sr-only");
    const pill = yaml.querySelector("[data-pill]")!;
    expect(pill).toHaveTextContent("YAML");
    expect(pill).toHaveAttribute("aria-hidden", "true");
    expect(pill).toHaveClass("group-hover:opacity-100", "group-focus-visible:opacity-100");
  });

  it("open: names are shown beside the symbols, without pills", () => {
    render(<FormatRail activeId="json" collapsed={false} onToggle={() => {}} />);
    const yaml = screen.getByRole("link", { name: "YAML" });
    expect(yaml.querySelector("[data-name]")).toHaveClass("md:not-sr-only");
    expect(yaml.querySelector("[data-pill]")).toBeNull();
  });

  it("phones always show symbols only (names stay readable to screen readers)", () => {
    render(<FormatRail activeId="json" collapsed={false} onToggle={() => {}} />);
    const names = document.querySelectorAll("[data-name]");
    expect(names).toHaveLength(6);
    for (const name of names) expect(name).toHaveClass("sr-only");
  });

  it("marks the selected format as filled", () => {
    render(<FormatRail activeId="xml" collapsed onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: "XML" })).toHaveClass("bg-text");
    expect(screen.getByRole("link", { name: "JSON" })).not.toHaveClass("bg-text");
  });

  it("is labelled as format navigation", () => {
    render(<FormatRail activeId="json" />);
    expect(screen.getByRole("navigation", { name: "Formats" })).toBeInTheDocument();
  });
});
