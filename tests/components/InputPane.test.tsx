import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { InputPane } from "@/components/InputPane";
import { FORMATS } from "@/formats/registry";

function renderInput(formatId: (typeof FORMATS)[number]["id"], value = "") {
  return render(
    <InputPane
      formatId={formatId}
      value={value}
      onChange={vi.fn()}
      onClear={vi.fn()}
      settings={{}}
      onSettingChange={vi.fn()}
    />,
  );
}

describe("InputPane placeholder", () => {
  it.each(FORMATS.map((f) => [f.id, f.examples.valid] as const))(
    "shows the %s example as a faint placeholder when empty",
    (id, example) => {
      const { container } = renderInput(id);
      const placeholder = container.querySelector(".cm-placeholder");
      expect(placeholder).not.toBeNull();
      expect(placeholder!.textContent).toBe(example);
    },
  );

  it("is only a placeholder: the editor itself stays empty", () => {
    const { container } = renderInput("json");
    const view = EditorView.findFromDOM(container.querySelector(".cm-content") as HTMLElement)!;
    expect(view.state.doc.length).toBe(0);
  });

  it("goes away as soon as there is text", () => {
    const { container } = renderInput("json", "{}");
    expect(container.querySelector(".cm-placeholder")).toBeNull();
  });

  it("comes back when the text is cleared", () => {
    const { container } = renderInput("json", "{}");
    const view = EditorView.findFromDOM(container.querySelector(".cm-content") as HTMLElement)!;
    act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "" } }));
    expect(container.querySelector(".cm-placeholder")).not.toBeNull();
  });
});
