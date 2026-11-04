import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import KineticGrid, { isBackgroundClick } from "@/components/ui/kinetic-grid";

// ─── Fakes: jsdom has no canvas and no real animation frames ────────────────

let ctx: Record<string, unknown>;
const frames = new Map<number, FrameRequestCallback>();
let nextFrameId = 1;
let clock = 1000; // fake performance.now(), advanced 16ms per frame

function fakeContext() {
  const store: Record<string, unknown> = {
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return new Proxy(store, {
    get: (target, prop: string) => (prop in target ? target[prop] : (target[prop] = vi.fn())),
    set: (target, prop: string, value) => ((target[prop] = value), true),
  });
}

/** Runs queued animation frames until none are left (or the limit is hit). Returns how many ran. */
function runFramesUntilIdle(limit = 1000) {
  let ran = 0;
  while (frames.size > 0 && ran < limit) {
    const batch = [...frames.values()];
    frames.clear();
    clock += 16;
    for (const cb of batch) cb(clock);
    ran++;
  }
  return ran;
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  ctx = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx as never);
  frames.clear();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frames.set(nextFrameId, cb);
    return nextFrameId++;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => void frames.delete(id));
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  setReducedMotion(false);
  setHidden(false);
});

afterEach(() => vi.restoreAllMocks());

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("KineticGrid", () => {
  it("is decorative and hidden from assistive tech", () => {
    const { container } = render(<KineticGrid />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.querySelector("canvas")).not.toBeNull();
  });

  it("draws one still frame on mount and then stays idle", () => {
    render(<KineticGrid />);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it("animates while the mouse moves, then stops once settled", () => {
    render(<KineticGrid />);
    // The first move snaps the warp to the cursor; the second one eases toward it.
    fireEvent.mouseMove(window, { clientX: 200, clientY: 150 });
    fireEvent.mouseMove(window, { clientX: 320, clientY: 150 });
    expect(frames.size).toBe(1);
    const ran = runFramesUntilIdle();
    expect(ran).toBeGreaterThan(1);
    expect(ran).toBeLessThan(1000);
    expect(frames.size).toBe(0);
  });

  it("never animates when the user prefers reduced motion", () => {
    setReducedMotion(true);
    render(<KineticGrid />);
    fireEvent.mouseMove(window, { clientX: 200, clientY: 150 });
    fireEvent.click(document.body);
    expect(frames.size).toBe(0);
  });

  it("ripples on clicks on the background", () => {
    render(<KineticGrid />);
    const gap = document.body.appendChild(document.createElement("main"));
    fireEvent.click(gap, { clientX: 10, clientY: 10 });
    expect(frames.size).toBe(1);
    expect(runFramesUntilIdle()).toBeLessThan(1000);
    gap.remove();
  });

  it("does not ripple on clicks on controls or panes", () => {
    render(<KineticGrid />);
    const pane = document.body.appendChild(document.createElement("section"));
    pane.className = "pane";
    const button = pane.appendChild(document.createElement("button"));
    fireEvent.click(button);
    expect(frames.size).toBe(0);
    pane.remove();
  });

  it("pauses while the tab is hidden", () => {
    render(<KineticGrid />);
    fireEvent.mouseMove(window, { clientX: 200, clientY: 150 });
    expect(frames.size).toBe(1);
    setHidden(true);
    expect(frames.size).toBe(0);
    fireEvent.mouseMove(window, { clientX: 300, clientY: 150 });
    expect(frames.size).toBe(0);
    setHidden(false);
    expect(frames.size).toBe(1);
  });

  it("draws sharp lines on high-density screens", () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });
    const { container } = render(<KineticGrid />);
    const canvas = container.querySelector("canvas")!;
    expect(canvas.width).toBe(2048);
    expect(canvas.height).toBe(1536);
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it("stops listening after unmount", () => {
    const { unmount } = render(<KineticGrid />);
    unmount();
    fireEvent.mouseMove(window, { clientX: 200, clientY: 150 });
    expect(frames.size).toBe(0);
  });
});

describe("isBackgroundClick", () => {
  function el(html: string, selector: string) {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host.querySelector(selector);
  }

  it("counts empty page areas as background", () => {
    expect(isBackgroundClick(document.body)).toBe(true);
    expect(isBackgroundClick(el("<main></main>", "main"))).toBe(true);
    expect(isBackgroundClick(el('<nav aria-label="Formats"></nav>', "nav"))).toBe(true);
  });

  it("counts empty top-bar space as background", () => {
    expect(isBackgroundClick(el("<header><span>formatly</span></header>", "span"))).toBe(true);
    expect(isBackgroundClick(el("<header><button>Shortcuts</button></header>", "button"))).toBe(false);
  });

  it("ignores controls, panes and dialogs", () => {
    expect(isBackgroundClick(el("<button>Copy</button>", "button"))).toBe(false);
    expect(isBackgroundClick(el('<a href="/json">JSON</a>', "a"))).toBe(false);
    expect(isBackgroundClick(el("<select></select>", "select"))).toBe(false);
    expect(isBackgroundClick(el('<section class="pane"><p>x</p></section>', "p"))).toBe(false);
    expect(isBackgroundClick(el("<dialog><p>x</p></dialog>", "p"))).toBe(false);
  });

  it("ignores a missing target", () => {
    expect(isBackgroundClick(null)).toBe(false);
  });
});
