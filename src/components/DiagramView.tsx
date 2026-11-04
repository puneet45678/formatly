"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Scan, ZoomIn, ZoomOut } from "lucide-react";

// The SVG arrives sanitized: formatters/mermaid.ts renders with securityLevel "strict"
// and then runs DOMPurify on the result, before it is set as innerHTML here.

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;
export const FIT_PADDING = 16;
const ZOOM_STEP = 1.25;

type Size = { w: number; h: number };
type Point = { x: number; y: number };
/** Where the diagram sits: its zoom, and its top-left corner inside the viewport. */
export type View = { scale: number; x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Zooms by `factor`, keeping `point` (viewport coordinates) still under the cursor. */
export function zoomAt(view: View, factor: number, point: Point): View {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  const f = scale / view.scale;
  return { scale, x: point.x - (point.x - view.x) * f, y: point.y - (point.y - view.y) * f };
}

/** Scales the diagram to fit the viewport (with padding) and centers it. */
export function fitView(content: Size, viewport: Size, maxScale = MAX_SCALE): View {
  if (!content.w || !content.h || !viewport.w || !viewport.h) return { scale: 1, x: 0, y: 0 };
  const scale = clamp(
    Math.min((viewport.w - 2 * FIT_PADDING) / content.w, (viewport.h - 2 * FIT_PADDING) / content.h),
    MIN_SCALE,
    maxScale,
  );
  return { scale, x: (viewport.w - content.w * scale) / 2, y: (viewport.h - content.h * scale) / 2 };
}

/** The diagram's natural size, from its viewBox or width/height. */
function intrinsicSize(svg: SVGSVGElement | null | undefined): Size {
  if (!svg) return { w: 0, h: 0 };
  const box = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  if (box?.length === 4 && box[2] > 0 && box[3] > 0) return { w: box[2], h: box[3] };
  return { w: Number.parseFloat(svg.getAttribute("width") ?? "") || 0, h: Number.parseFloat(svg.getAttribute("height") ?? "") || 0 };
}

export function DiagramView({ svg }: { svg: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; start: Point; from: Point } | null>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });

  function measure() {
    const viewport = viewportRef.current;
    return {
      content: intrinsicSize(contentRef.current?.querySelector("svg")),
      viewport: { w: viewport?.clientWidth ?? 0, h: viewport?.clientHeight ?? 0 },
    };
  }

  const viewportCenter = (): Point => {
    const { viewport } = measure();
    return { x: viewport.w / 2, y: viewport.h / 2 };
  };

  // Give the SVG a fixed natural size (Mermaid outputs width="100%"), so zooming
  // is done only by our transform.
  useEffect(() => {
    const el = contentRef.current?.querySelector("svg");
    const size = intrinsicSize(el);
    if (!el || !size.w) return;
    el.setAttribute("width", String(size.w));
    el.setAttribute("height", String(size.h));
    el.style.maxWidth = "none";
  }, [svg]);

  // Open the diagram fitted to the pane, but never enlarged past 100%.
  useEffect(() => {
    const { content, viewport } = measure();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs the laid-out size, only known after render
    setView(fitView(content, viewport, 1));
  }, []);

  // Wheel zoom needs a non-passive listener so the page doesn't scroll instead.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = viewport!.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.0015), point));
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as Element).closest("button")) return;
    drag.current = { pointerId: e.pointerId, start: { x: e.clientX, y: e.clientY }, from: { x: view.x, y: view.y } };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setView((v) => ({ ...v, x: d.from.x + e.clientX - d.start.x, y: d.from.y + e.clientY - d.start.y }));
  }

  function endDrag() {
    drag.current = null;
  }

  const fit = () => {
    const { content, viewport } = measure();
    setView(fitView(content, viewport));
  };

  return (
    <div
      ref={viewportRef}
      data-testid="diagram-viewport"
      className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        ref={contentRef}
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="absolute right-2.5 bottom-2.5 flex items-center gap-0.5 rounded-lg border border-line bg-[#111]/90 p-0.5 text-[11px] text-muted">
        <button type="button" aria-label="Zoom out" title="Zoom out" className="zoom-btn" onClick={() => setView((v) => zoomAt(v, 1 / ZOOM_STEP, viewportCenter()))}>
          <ZoomOut aria-hidden="true" className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Reset zoom to 100%"
          title="Reset to 100%"
          data-testid="zoom-level"
          className="zoom-btn w-11 font-mono tabular-nums"
          onClick={() => setView((v) => zoomAt(v, 1 / v.scale, viewportCenter()))}
        >
          {Math.round(view.scale * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" className="zoom-btn" onClick={() => setView((v) => zoomAt(v, ZOOM_STEP, viewportCenter()))}>
          <ZoomIn aria-hidden="true" className="size-3.5" />
        </button>
        <button type="button" aria-label="Fit to view" title="Fit to view" className="zoom-btn" onClick={fit}>
          <Scan aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
