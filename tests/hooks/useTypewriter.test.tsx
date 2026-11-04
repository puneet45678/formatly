import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTypewriter } from "@/hooks/useTypewriter";

const TIMING = { typeMs: 100, deleteMs: 50, holdMs: 1000, gapMs: 200 };

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});
afterEach(() => vi.useRealTimers());

describe("useTypewriter", () => {
  it("types the first word one letter at a time", async () => {
    const { result } = renderHook(() => useTypewriter(["json", "yaml"], TIMING));
    expect(result.current).toBe("");
    await advance(100);
    expect(result.current).toBe("j");
    await advance(300);
    expect(result.current).toBe("json");
  });

  it("holds the full word, then erases it", async () => {
    const { result } = renderHook(() => useTypewriter(["json", "yaml"], TIMING));
    await advance(400); // typed
    await advance(999);
    expect(result.current).toBe("json");
    await advance(1 + 50);
    expect(result.current).toBe("jso");
    await advance(150);
    expect(result.current).toBe("");
  });

  it("moves on to the next word and loops around", async () => {
    const { result } = renderHook(() => useTypewriter(["ab", "cd"], TIMING));
    // "ab": type 200, hold 1000, erase 100, gap 200 → then "c"
    await advance(200 + 1000 + 100 + 200 + 100);
    expect(result.current).toBe("c");
    await advance(100 + 1000 + 100 + 200 + 200);
    expect(result.current).toBe("ab");
  });

  it("shows the first word still when the user prefers reduced motion", async () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useTypewriter(["json", "yaml"], TIMING));
    expect(result.current).toBe("json");
    await advance(10_000);
    expect(result.current).toBe("json");
  });

  it("stops its timers when unmounted", async () => {
    const { unmount } = renderHook(() => useTypewriter(["json"], TIMING));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
