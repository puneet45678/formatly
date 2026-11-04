import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
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

  it("ignores an error line past the end", () => {
    const { container } = render(<CodeEditor value={"a"} formatId="json" errorLine={9} ariaLabel="JSON input" />);
    expect(container.querySelector(".cm-error-line")).toBeNull();
  });
});
