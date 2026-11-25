"use client";

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { PanelLeftOpen } from "lucide-react";
import {
  DEFAULT_LAYOUT,
  DIVIDER_PX,
  clampFraction,
  fractionFromPointer,
  nudge,
  shouldCollapse,
  type SplitLayout,
} from "@/lib/split";
import { cn } from "@/lib/utils";

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  /** Names the collapsed input, shown sideways on its rail. */
  railLabel: string;
  layout: SplitLayout;
  onLayoutChange: (next: SplitLayout) => void;
  /** Hide the left side completely (expanded output). It stays mounted so it keeps its state. */
  leftHidden?: boolean;
}

/**
 * Two panes side by side with a draggable divider (desktop). The left pane can collapse to a thin
 * rail. Below the md breakpoint the panes simply stack, with no divider.
 *
 * While dragging, the width is written straight to a CSS variable, so no React render happens per
 * mouse move; the layout is committed once when the drag ends.
 */
export function SplitView({ left, right, railLabel, layout, onLayoutChange, leftHidden = false }: SplitViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ fraction: number; moved: boolean } | null>(null);
  const leftPane = useRef<HTMLDivElement>(null);
  const divider = useRef<HTMLDivElement>(null);
  const railButton = useRef<HTMLButtonElement>(null);
  const collapsed = layout.inputCollapsed && !leftHidden;
  const showDivider = !layout.inputCollapsed && !leftHidden;

  // Collapsing or expanding removes the control you were using, which would drop keyboard focus to
  // the top of the page. If focus was lost that way, put it on the control that took its place.
  const wasCollapsed = useRef(collapsed);
  useEffect(() => {
    if (wasCollapsed.current === collapsed) return;
    wasCollapsed.current = collapsed;
    const active = document.activeElement;
    const lost = !active || active === document.body || leftPane.current?.contains(active);
    if (lost) (collapsed ? railButton.current : divider.current)?.focus();
  }, [collapsed]);

  const paneSpace = () => (container.current?.getBoundingClientRect().width ?? 0) - DIVIDER_PX;
  const setWidth = (fraction: number) => container.current?.style.setProperty("--f", String(fraction));

  function endDrag() {
    drag.current = null;
    delete container.current?.dataset.dragging;
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId); // keeps the drag alive outside the window
    drag.current = { fraction: layout.inputFraction, moved: false };
    if (container.current) container.current.dataset.dragging = "true";
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !container.current) return;
    const rect = container.current.getBoundingClientRect();
    const raw = fractionFromPointer(e.clientX, rect);
    if (shouldCollapse(raw, rect.width - DIVIDER_PX)) {
      endDrag();
      setWidth(layout.inputFraction); // so expanding again returns to the width from before the drag
      onLayoutChange({ ...layout, inputCollapsed: true });
      return;
    }
    const fraction = clampFraction(raw, rect.width - DIVIDER_PX);
    drag.current = { fraction, moved: true };
    setWidth(fraction);
  }

  function onPointerEnd() {
    const finished = drag.current;
    endDrag();
    if (finished?.moved) onLayoutChange({ inputFraction: finished.fraction, inputCollapsed: false });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const space = paneSpace();
    const move = (fraction: number) => onLayoutChange({ inputFraction: clampFraction(fraction, space), inputCollapsed: false });
    // The page scrolls now, so a key this handles must not also scroll it (End would jump to the footer).
    if (["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(e.key)) e.preventDefault();
    switch (e.key) {
      case "ArrowLeft":
        return move(nudge(layout.inputFraction, -1, e.shiftKey));
      case "ArrowRight":
        return move(nudge(layout.inputFraction, 1, e.shiftKey));
      case "Home":
        return move(0);
      case "End":
        return move(1);
      case "Enter":
      case " ":
        return onLayoutChange({ ...layout, inputCollapsed: true });
    }
  }

  return (
    <div
      ref={container}
      style={{ "--f": layout.inputFraction } as CSSProperties}
      className="flex min-h-0 flex-1 flex-col gap-3.5 md:flex-row md:gap-0 data-[dragging=true]:cursor-col-resize data-[dragging=true]:select-none"
    >
      {/* Kept mounted while hidden or collapsed so the editor keeps its text and undo history. */}
      <div
        ref={leftPane}
        hidden={leftHidden}
        className={cn(
          // The input takes its saved share, but never so much that the output drops under 240px
          // (the window may be smaller than when the share was saved), nor less than 240px itself.
          "flex min-w-0 flex-col *:flex-1 md:min-h-0 md:*:min-h-0 md:shrink-0 md:grow-0 md:basis-[clamp(240px,calc((100%-12px)*var(--f)),calc(100%-252px))]",
          collapsed && "md:hidden",
        )}
      >
        {left}
      </div>

      {collapsed && (
        <div className="flex w-11 shrink-0 flex-col items-center gap-3 rounded-[10px] border border-line bg-pane py-2.5 backdrop-blur-sm max-md:hidden md:mr-3">
          <button
            ref={railButton}
            type="button"
            aria-label="Expand input"
            title="Expand input"
            onClick={() => onLayoutChange({ ...layout, inputCollapsed: false })}
            className="chip p-1"
          >
            <PanelLeftOpen aria-hidden="true" className="size-3.5" />
          </button>
          <span className="text-[11px] tracking-[.04em] whitespace-nowrap text-muted [writing-mode:vertical-rl]">
            {railLabel}
          </span>
        </div>
      )}

      {showDivider && (
        <div
          ref={divider}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize input and output"
          aria-valuenow={Math.round(layout.inputFraction * 100)}
          aria-valuemin={10}
          aria-valuemax={90}
          tabIndex={0}
          title="Drag to resize. Double-click to reset."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDoubleClick={() => onLayoutChange(DEFAULT_LAYOUT)}
          onKeyDown={onKeyDown}
          className="group w-3 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none max-md:hidden md:flex"
        >
          <span className="h-9 w-[3px] rounded-full bg-[#2e2e2e] transition-[height,background-color] group-hover:h-14 group-hover:bg-k group-focus-visible:h-14 group-focus-visible:bg-k in-data-[dragging=true]:h-14 in-data-[dragging=true]:bg-k motion-reduce:transition-none" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col *:flex-1 md:min-h-0 md:*:min-h-0">{right}</div>
    </div>
  );
}
