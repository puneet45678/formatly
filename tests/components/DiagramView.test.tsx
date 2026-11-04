import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiagramView, FIT_PADDING, MAX_SCALE, MIN_SCALE, fitView, zoomAt } from "@/components/DiagramView";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120" data-testid="d"></svg>';

describe("zoomAt", () => {
  it("keeps the point under the cursor still", () => {
    expect(zoomAt({ scale: 1, x: 0, y: 0 }, 2, { x: 100, y: 50 })).toEqual({ scale: 2, x: -100, y: -50 });
  });

  it("clamps to the zoom limits", () => {
    expect(zoomAt({ scale: MAX_SCALE, x: 0, y: 0 }, 2, { x: 0, y: 0 }).scale).toBe(MAX_SCALE);
    expect(zoomAt({ scale: MIN_SCALE, x: 0, y: 0 }, 0.5, { x: 0, y: 0 }).scale).toBe(MIN_SCALE);
  });
});

describe("fitView", () => {
  it("scales the diagram to fit the viewport with padding, centered", () => {
    const view = fitView({ w: 400, h: 200 }, { w: 800, h: 600 });
    const scale = (800 - 2 * FIT_PADDING) / 400;
    expect(view.scale).toBeCloseTo(scale);
    expect(view.x).toBeCloseTo((800 - 400 * scale) / 2);
    expect(view.y).toBeCloseTo((600 - 200 * scale) / 2);
  });

  it("can cap the scale (so small diagrams open at 100%)", () => {
    expect(fitView({ w: 100, h: 50 }, { w: 800, h: 600 }, 1).scale).toBe(1);
  });

  it("falls back to 100% when nothing has a size yet", () => {
    expect(fitView({ w: 0, h: 0 }, { w: 800, h: 600 })).toEqual({ scale: 1, x: 0, y: 0 });
    expect(fitView({ w: 100, h: 50 }, { w: 0, h: 0 })).toEqual({ scale: 1, x: 0, y: 0 });
  });
});

describe("DiagramView", () => {
  const zoomLabel = () => screen.getByTestId("zoom-level");
  const content = () => screen.getByTestId("d").parentElement as HTMLElement;

  it("renders the diagram at 100%", () => {
    render(<DiagramView svg={SVG} />);
    expect(screen.getByTestId("d")).toBeInTheDocument();
    expect(zoomLabel()).toHaveTextContent("100%");
  });

  it("zooms in and out with the buttons", () => {
    render(<DiagramView svg={SVG} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoomLabel()).toHaveTextContent("125%");
    expect(content().style.transform).toContain("scale(1.25)");
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(zoomLabel()).toHaveTextContent("80%");
  });

  it("resets to 100%", () => {
    render(<DiagramView svg={SVG} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom to 100%" }));
    expect(zoomLabel()).toHaveTextContent("100%");
  });

  it("has a fit-to-view button", () => {
    render(<DiagramView svg={SVG} />);
    expect(screen.getByRole("button", { name: "Fit to view" })).toBeInTheDocument();
  });

  it("zooms with the mouse wheel", () => {
    render(<DiagramView svg={SVG} />);
    fireEvent.wheel(screen.getByTestId("diagram-viewport"), { deltaY: -100, clientX: 10, clientY: 10 });
    expect(Number.parseInt(zoomLabel().textContent!)).toBeGreaterThan(100);
  });

  it("pans by dragging", () => {
    render(<DiagramView svg={SVG} />);
    const viewport = screen.getByTestId("diagram-viewport");
    fireEvent.pointerDown(viewport, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 40, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(viewport, { clientX: 40, clientY: 30, pointerId: 1 });
    expect(content().style.transform).toContain("translate(30px, 20px)");
    // Moving after release does nothing.
    fireEvent.pointerMove(viewport, { clientX: 90, clientY: 90, pointerId: 1 });
    expect(content().style.transform).toContain("translate(30px, 20px)");
  });
});
