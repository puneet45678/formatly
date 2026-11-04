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

  it("keeps format names for screen readers and hover when collapsed", () => {
    render(<FormatRail activeId="json" collapsed onToggle={() => {}} />);
    const yaml = screen.getByRole("link", { name: "YAML" });
    expect(yaml).toHaveAttribute("title", "YAML");
    expect(screen.getByText("YAML")).toHaveClass("md:sr-only");
  });

  it("shows format names normally when expanded", () => {
    render(<FormatRail activeId="json" collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText("YAML")).not.toHaveClass("md:sr-only");
    expect(screen.getByRole("link", { name: "YAML" })).not.toHaveAttribute("title");
  });

  it("is labelled as format navigation", () => {
    render(<FormatRail activeId="json" />);
    expect(screen.getByRole("navigation", { name: "Formats" })).toBeInTheDocument();
  });
});
