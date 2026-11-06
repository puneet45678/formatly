import { describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { CodeEditor } from "@/components/CodeEditor";

describe("CodeEditor", () => {
  it("shows the value", () => {
    const { container } = render(<CodeEditor value={'{"a":1}'} formatId="json" ariaLabel="JSON input" />);
    expect(container.querySelector(".cm-content")).toHaveTextContent('{"a":1}');
  });

  it("marks the error line", () => {
    const { container } = render(<CodeEditor value={"a\nb\nc"} formatId="json" errorLine={2} ariaLabel="JSON input" />);
    const marked = container.querySelectorAll(".cm-error-line");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveTextContent("b");
  });

  it("has no error mark without errorLine", () => {
    const { container } = render(<CodeEditor value={"a\nb"} formatId="json" ariaLabel="JSON input" />);
    expect(container.querySelector(".cm-error-line")).toBeNull();
  });

  it("does not rebuild the editor setup when the parent re-renders", () => {
    const { container, rerender } = render(
      <CodeEditor value="a" onChange={() => {}} formatId="json" ariaLabel="JSON input" />,
    );
    const view = EditorView.findFromDOM(container.querySelector(".cm-content") as HTMLElement)!;
    const dispatch = vi.spyOn(view, "dispatch");
    // A parent re-render passes a fresh onChange closure each time, like Workbench does.
    rerender(<CodeEditor value="a" onChange={() => {}} formatId="json" ariaLabel="JSON input" />);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("calls the latest onChange after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { container, rerender } = render(<CodeEditor value="" onChange={first} formatId="json" ariaLabel="JSON input" />);
    rerender(<CodeEditor value="" onChange={second} formatId="json" ariaLabel="JSON input" />);
    const view = EditorView.findFromDOM(container.querySelector(".cm-content") as HTMLElement)!;
    act(() => view.dispatch({ changes: { from: 0, insert: "x" } }));
    expect(second).toHaveBeenCalledWith("x", expect.anything());
    expect(first).not.toHaveBeenCalled();
  });

  it("ignores an error line past the end", () => {
    const { container } = render(<CodeEditor value={"a"} formatId="json" errorLine={9} ariaLabel="JSON input" />);
    expect(container.querySelector(".cm-error-line")).toBeNull();
  });

  it("colors Markdown headings and bold text but not plain paragraphs", async () => {
    const { container } = render(<CodeEditor value={"# Title\n\nplain words\n\n**bold**"} formatId="markdown" ariaLabel="Markdown input" />);
    // The Markdown language loads on demand; once it arrives the spans get highlight classes.
    await waitFor(() => expect(container.querySelectorAll(".cm-line span[class]").length).toBeGreaterThan(0));
    const lines = [...container.querySelectorAll(".cm-line")];
    const styled = (text: string) => lines.find((l) => l.textContent?.includes(text))?.querySelector("span[class]");
    expect(styled("Title")).not.toBeNull();
    expect(styled("bold")).not.toBeNull();
    expect(styled("plain words")).toBeNull();
  });

  describe("onPasteIntoEmpty", () => {
    const setup = (value = "", onPasteIntoEmpty = vi.fn()) => {
      const { container, rerender } = render(
        <CodeEditor value={value} onChange={() => {}} onPasteIntoEmpty={onPasteIntoEmpty} formatId="json" ariaLabel="JSON input" />,
      );
      const view = EditorView.findFromDOM(container.querySelector(".cm-content") as HTMLElement)!;
      return { view, onPasteIntoEmpty, rerender };
    };

    it("reports the text pasted into an empty editor", () => {
      const { view, onPasteIntoEmpty } = setup();
      act(() => view.dispatch({ changes: { from: 0, insert: "a: 1" }, userEvent: "input.paste" }));
      expect(onPasteIntoEmpty).toHaveBeenCalledTimes(1);
      expect(onPasteIntoEmpty).toHaveBeenCalledWith("a: 1");
    });

    it("stays quiet when the editor already had text", () => {
      const { view, onPasteIntoEmpty } = setup("existing");
      act(() => view.dispatch({ changes: { from: 8, insert: " more" }, userEvent: "input.paste" }));
      expect(onPasteIntoEmpty).not.toHaveBeenCalled();
    });

    it("stays quiet for typing and for text set from outside", () => {
      const { view, onPasteIntoEmpty } = setup();
      act(() => view.dispatch({ changes: { from: 0, insert: "x" }, userEvent: "input.type" }));
      act(() => view.dispatch({ changes: { from: 0, to: 1, insert: "" } }));
      act(() => view.dispatch({ changes: { from: 0, insert: "y" } }));
      expect(onPasteIntoEmpty).not.toHaveBeenCalled();
    });

    it("calls the latest callback after a re-render, without rebuilding the editor", () => {
      const first = vi.fn();
      const second = vi.fn();
      const { view, rerender } = setup("", first);
      const dispatch = vi.spyOn(view, "dispatch");
      rerender(<CodeEditor value="" onChange={() => {}} onPasteIntoEmpty={second} formatId="json" ariaLabel="JSON input" />);
      expect(dispatch).not.toHaveBeenCalled();
      act(() => view.dispatch({ changes: { from: 0, insert: "z" }, userEvent: "input.paste" }));
      expect(second).toHaveBeenCalledWith("z");
      expect(first).not.toHaveBeenCalled();
    });
  });
});
