import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SplitView } from "@/components/SplitView";
import { DEFAULT_LAYOUT, type SplitLayout } from "@/lib/split";

// jsdom has no layout, so every element reports the same box: 1012px wide, which is
// 1000px of pane space plus the 12px divider.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, right: 1012, bottom: 600, width: 1012, height: 600, x: 0, y: 0, toJSON: () => ({}),
  });
});
afterEach(() => vi.restoreAllMocks());

function setup(layout: SplitLayout = DEFAULT_LAYOUT, leftHidden = false) {
  const onLayoutChange = vi.fn<(next: SplitLayout) => void>();
  const view = render(
    <SplitView
      left={<section aria-label="Input">left</section>}
      right={<section aria-label="Output">right</section>}
      railLabel="Input · JSON"
      layout={layout}
      onLayoutChange={onLayoutChange}
      leftHidden={leftHidden}
    />,
  );
  return { onLayoutChange, view };
}
const separator = () => screen.getByRole("separator");

describe("SplitView dragging", () => {
  it("commits the new layout once, on release", () => {
    const { onLayoutChange } = setup();
    fireEvent.pointerDown(separator(), { clientX: 506, pointerId: 1, button: 0 });
    fireEvent.pointerMove(separator(), { clientX: 406, pointerId: 1 });
    fireEvent.pointerMove(separator(), { clientX: 306, pointerId: 1 });
    expect(onLayoutChange).not.toHaveBeenCalled(); // nothing is committed while dragging
    fireEvent.pointerUp(separator(), { clientX: 306, pointerId: 1 });
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange.mock.calls[0][0].inputFraction).toBeCloseTo(0.3);
    expect(onLayoutChange.mock.calls[0][0].inputCollapsed).toBe(false);
  });

  it("follows the pointer while dragging without waiting for state", () => {
    const { view } = setup();
    fireEvent.pointerDown(separator(), { clientX: 506, pointerId: 1, button: 0 });
    fireEvent.pointerMove(separator(), { clientX: 306, pointerId: 1 });
    expect(Number((view.container.firstElementChild as HTMLElement).style.getPropertyValue("--f"))).toBeCloseTo(0.3);
  });

  it("keeps each pane at least 240px wide", () => {
    const { onLayoutChange } = setup();
    fireEvent.pointerDown(separator(), { clientX: 506, pointerId: 1, button: 0 });
    fireEvent.pointerMove(separator(), { clientX: 200, pointerId: 1 }); // raw 0.19 → 190px
    fireEvent.pointerUp(separator(), { pointerId: 1 });
    expect(onLayoutChange.mock.calls[0][0].inputFraction).toBeCloseTo(0.24);
  });

  it("ends cleanly when the browser cancels the drag", () => {
    const { onLayoutChange } = setup();
    fireEvent.pointerDown(separator(), { clientX: 506, pointerId: 1, button: 0 });
    fireEvent.pointerMove(separator(), { clientX: 406, pointerId: 1 });
    fireEvent.pointerCancel(separator(), { pointerId: 1 });
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(separator(), { clientX: 700, pointerId: 1 }); // no longer dragging
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
  });

  it("collapses the input when dragged well past the minimum, remembering the last width", () => {
    const { onLayoutChange } = setup({ inputFraction: 0.4, inputCollapsed: false });
    fireEvent.pointerDown(separator(), { clientX: 406, pointerId: 1, button: 0 });
    fireEvent.pointerMove(separator(), { clientX: 60, pointerId: 1 });
    expect(onLayoutChange).toHaveBeenCalledWith({ inputFraction: 0.4, inputCollapsed: true });
  });

  it("ignores other mouse buttons", () => {
    const { onLayoutChange } = setup();
    fireEvent.pointerDown(separator(), { clientX: 506, pointerId: 1, button: 2 });
    fireEvent.pointerMove(separator(), { clientX: 306, pointerId: 1 });
    fireEvent.pointerUp(separator(), { pointerId: 1 });
    expect(onLayoutChange).not.toHaveBeenCalled();
  });
});

describe("SplitView keyboard and semantics", () => {
  it("is a focusable vertical separator that reports its position", () => {
    setup({ inputFraction: 0.35, inputCollapsed: false });
    expect(separator()).toHaveAttribute("aria-orientation", "vertical");
    expect(separator()).toHaveAttribute("aria-valuenow", "35");
    expect(separator()).toHaveAttribute("tabindex", "0");
    expect(separator()).toHaveAccessibleName("Resize input and output");
  });

  it("moves with the arrow keys, further with Shift", () => {
    const { onLayoutChange } = setup();
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    expect(onLayoutChange.mock.lastCall![0].inputFraction).toBeCloseTo(0.52);
    fireEvent.keyDown(separator(), { key: "ArrowLeft", shiftKey: true });
    expect(onLayoutChange.mock.lastCall![0].inputFraction).toBeCloseTo(0.4);
  });

  it("Home and End jump to the narrowest and widest allowed input", () => {
    const { onLayoutChange } = setup();
    fireEvent.keyDown(separator(), { key: "Home" });
    expect(onLayoutChange.mock.lastCall![0].inputFraction).toBeCloseTo(0.24);
    fireEvent.keyDown(separator(), { key: "End" });
    expect(onLayoutChange.mock.lastCall![0].inputFraction).toBeCloseTo(0.76);
  });

  it("Enter collapses the input and double-click resets to an even split", () => {
    const { onLayoutChange } = setup({ inputFraction: 0.3, inputCollapsed: false });
    fireEvent.keyDown(separator(), { key: "Enter" });
    expect(onLayoutChange).toHaveBeenLastCalledWith({ inputFraction: 0.3, inputCollapsed: true });
    fireEvent.doubleClick(separator());
    expect(onLayoutChange).toHaveBeenLastCalledWith(DEFAULT_LAYOUT);
  });

  it("is hidden on phones, where the panes stack", () => {
    setup();
    expect(separator()).toHaveClass("max-md:hidden");
  });
});

describe("SplitView collapsed and hidden", () => {
  it("shows a rail with an Expand input button instead of the input", () => {
    const { onLayoutChange } = setup({ inputFraction: 0.3, inputCollapsed: true });
    expect(screen.queryByRole("separator")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand input" }));
    expect(onLayoutChange).toHaveBeenCalledWith({ inputFraction: 0.3, inputCollapsed: false });
    expect(screen.getByText("Input · JSON")).toBeInTheDocument();
  });

  it("keeps the input mounted while collapsed so its text and undo history survive", () => {
    setup({ inputFraction: 0.3, inputCollapsed: true });
    expect(screen.getByText("left")).toBeInTheDocument();
  });

  it("shows no divider and no rail while the input is hidden (expanded output)", () => {
    setup({ inputFraction: 0.3, inputCollapsed: true }, true);
    expect(screen.queryByRole("separator")).toBeNull();
    expect(screen.queryByRole("button", { name: "Expand input" })).toBeNull();
    expect(screen.getByText("left").closest("[hidden]")).not.toBeNull();
  });
});

describe("SplitView keeps the page from scrolling", () => {
  it("handles Home, End and the arrows without scrolling the page", () => {
    setup();
    for (const key of ["Home", "End", "ArrowLeft", "ArrowRight", "Enter", " "]) {
      // fireEvent returns false when the default action was prevented.
      expect(fireEvent.keyDown(separator(), { key })).toBe(false);
    }
  });

  it("leaves other keys alone", () => {
    setup();
    expect(fireEvent.keyDown(separator(), { key: "Tab" })).toBe(true);
  });
});

describe("SplitView keeps the pane usable when the window is smaller than when it was saved", () => {
  it("clamps the input's width in CSS so the output keeps at least 240px", () => {
    const { view } = setup({ inputFraction: 0.9, inputCollapsed: false });
    const left = view.container.firstElementChild!.firstElementChild!;
    expect(left.className).toContain("clamp(240px,");
    expect(left.className).toContain("100%-252px"); // 240px for the output plus the 12px divider
  });
});

describe("SplitView keyboard focus", () => {
  // A parent that owns the layout the way Workbench does.
  function Controlled({ initial = DEFAULT_LAYOUT }: { initial?: SplitLayout }) {
    const [layout, setLayout] = useState(initial);
    return (
      <>
        <button type="button">outside</button>
        <SplitView
          left={
            <section aria-label="Input">
              <button type="button" onClick={() => setLayout({ ...layout, inputCollapsed: true })}>
                collapse from inside
              </button>
            </section>
          }
          right={<section aria-label="Output">right</section>}
          railLabel="Input · JSON"
          layout={layout}
          onLayoutChange={setLayout}
        />
      </>
    );
  }

  it("moves focus to the Expand input button when Enter collapses the divider you were on", () => {
    render(<Controlled />);
    separator().focus();
    fireEvent.keyDown(separator(), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Expand input" })).toHaveFocus();
  });

  it("moves focus back to the divider after Expand input", async () => {
    render(<Controlled initial={{ inputFraction: 0.5, inputCollapsed: true }} />);
    await userEvent.click(screen.getByRole("button", { name: "Expand input" }));
    expect(separator()).toHaveFocus();
  });

  it("moves focus to the rail when a button inside the input collapses it", async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole("button", { name: "collapse from inside" }));
    expect(screen.getByRole("button", { name: "Expand input" })).toHaveFocus();
  });

  it("does not take focus when the layout changes while you are somewhere else", () => {
    const { rerender } = render(<Controlled />);
    screen.getByRole("button", { name: "outside" }).focus();
    rerender(<Controlled initial={{ inputFraction: 0.5, inputCollapsed: true }} />);
    expect(screen.getByRole("button", { name: "outside" })).toHaveFocus();
  });

  it("does not take focus on the first render", () => {
    render(<Controlled initial={{ inputFraction: 0.5, inputCollapsed: true }} />);
    expect(document.body).toHaveFocus();
  });
});
