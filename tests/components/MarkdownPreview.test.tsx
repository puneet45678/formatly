import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarkdownPreview } from "@/components/MarkdownPreview";

describe("MarkdownPreview", () => {
  it("renders Markdown as a readable page", () => {
    render(<MarkdownPreview source={"# Title\n\nSome *text*.\n\n- one\n- two"} />);
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("supports GitHub-style tables", () => {
    render(<MarkdownPreview source={"| a | b |\n|---|---|\n| 1 | 2 |"} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });

  it("opens links in a new tab without leaking the page", () => {
    render(<MarkdownPreview source={"[docs](https://example.com)"} />);
    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("drops javascript: links", () => {
    render(<MarkdownPreview source={"[x](javascript:alert(1))"} />);
    expect(screen.getByText("x").closest("a")?.getAttribute("href") ?? "").not.toContain("javascript:");
  });

  it("blocks remote images until asked", () => {
    const { container } = render(<MarkdownPreview source={"![A cat](https://example.com/cat.png)"} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/A cat/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load image" }));
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://example.com/cat.png");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(img).toHaveAttribute("alt", "A cat");
  });

  it("shows inline data images right away", () => {
    const src = "data:image/png;base64,iVBORw0KGgo=";
    const { container } = render(<MarkdownPreview source={`![dot](${src})`} />);
    expect(container.querySelector("img")).toHaveAttribute("src", src);
  });

  it("does not render raw HTML", () => {
    const { container } = render(<MarkdownPreview source={"<b>bold</b>\n\n<script>alert(1)</script>"} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });
});
