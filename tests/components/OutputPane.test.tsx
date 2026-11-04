import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { getFormat } from "@/formats/registry";
import { OutputPane } from "@/components/OutputPane";

const markdownOk = { status: "ok" as const, output: "# Title\n\nBody" };

describe("OutputPane", () => {
  it("shows Markdown as a rendered preview by default", async () => {
    render(<OutputPane format={getFormat("markdown")} state={markdownOk} />);
    // The preview component loads lazily, so wait for it.
    expect(await screen.findByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches Markdown to the formatted source", async () => {
    const { container } = render(<OutputPane format={getFormat("markdown")} state={markdownOk} />);
    await screen.findByRole("heading", { level: 1, name: "Title" });
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

  it("shows the source when the preview's code fails to load", async () => {
    // e.g. offline, or the site was updated while this tab was open.
    // OutputPane sets up its previews when the module loads, so load a fresh
    // copy with Markdown's preview loader mocked to fail.
    let fail!: () => void;
    const loading = new Promise<never>((_, reject) => (fail = () => reject(new Error("chunk failed"))));
    vi.resetModules();
    vi.doMock("@/components/format-ui", async (importOriginal) => {
      const { FORMAT_UI } = await importOriginal<typeof import("@/components/format-ui")>();
      return {
        FORMAT_UI: {
          ...FORMAT_UI,
          markdown: { ...FORMAT_UI.markdown, preview: () => loading },
        },
      };
    });
    const { OutputPane: FreshOutputPane } = await import("@/components/OutputPane");
    const { getFormat: freshGetFormat } = await import("@/formats/registry");

    const { container } = render(<FreshOutputPane format={freshGetFormat("markdown")} state={markdownOk} />);
    await act(async () => {
      fail();
      await loading.catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 0)); // let React handle the failure
    });
    expect(container.querySelector(".cm-content")).toHaveTextContent("# Title");
    expect(screen.queryByRole("heading", { name: "Title" })).toBeNull();
    vi.doUnmock("@/components/format-ui");
  });
});
