import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { getFormat } from "@/formats/registry";
import { OutputPane } from "@/components/OutputPane";

const markdownOk = { status: "ok" as const, output: "# Title\n\nBody" };

describe("OutputPane", () => {
  it("shows Markdown as a rendered preview by default", () => {
    render(<OutputPane format={getFormat("markdown")} state={markdownOk} />);
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches Markdown to the formatted source", () => {
    const { container } = render(<OutputPane format={getFormat("markdown")} state={markdownOk} />);
    fireEvent.click(screen.getByRole("button", { name: "Source" }));
    expect(screen.queryByRole("heading", { name: "Title" })).toBeNull();
    expect(container.querySelector(".cm-content")).toHaveTextContent("# Title");
    expect(screen.getByRole("button", { name: "Source" })).toHaveAttribute("aria-pressed", "true");
  });

  it("only offers Preview/Source for Markdown", () => {
    render(<OutputPane format={getFormat("json")} state={{ status: "ok", output: "{}" }} />);
    expect(screen.queryByRole("button", { name: "Preview" })).toBeNull();
  });

  it("has an expand toggle", () => {
    const onToggleExpand = vi.fn();
    const { rerender } = render(
      <OutputPane format={getFormat("json")} state={{ status: "empty" }} expanded={false} onToggleExpand={onToggleExpand} />,
    );
    const expand = screen.getByRole("button", { name: "Expand output" });
    expect(expand).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(expand);
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    rerender(<OutputPane format={getFormat("json")} state={{ status: "empty" }} expanded onToggleExpand={onToggleExpand} />);
    expect(screen.getByRole("button", { name: "Exit expanded output" })).toHaveAttribute("aria-pressed", "true");
  });
});
