import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
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
});
