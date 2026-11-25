import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Intro } from "@/components/Intro";
import { INTRO } from "@/content/site";
import { DEMO_TIMING } from "@/hooks/useDemoLoop";

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});
afterEach(() => vi.useRealTimers());

const demo = () => screen.getByTestId("intro-demo");

describe("Intro (empty input)", () => {
  it("has the headline as the page's h1, the lead and the three facts", () => {
    render(<Intro compact={false} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(INTRO.headline.join(" "));
    expect(screen.getByText(INTRO.lead)).toBeInTheDocument();
    for (const fact of INTRO.facts) expect(screen.getByText(fact)).toBeInTheDocument();
  });

  it("has no buttons or links (it is information only)", () => {
    render(<Intro compact={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("hides the demo from screen readers", () => {
    render(<Intro compact={false} />);
    expect(demo()).toHaveAttribute("aria-hidden", "true");
  });

  it("types the 'before' text, then shows the tidied 'after', then starts over", () => {
    render(<Intro compact={false} />);
    expect(demo()).not.toHaveTextContent(INTRO.demo.before.slice(0, 6));
    act(() => vi.advanceTimersByTime(35 * 6 + 5));
    const partial = demo().textContent!;
    expect(partial).toContain(INTRO.demo.before.slice(0, 5));
    expect(partial).not.toContain("admin");
    act(() => vi.advanceTimersByTime(35 * INTRO.demo.before.length + 600));
    expect(demo()).toHaveTextContent('"user": "ada",');
    expect(demo().textContent).toContain(INTRO.demo.before); // the 'before' stays while the 'after' is shown
    act(() => vi.advanceTimersByTime(DEMO_TIMING.holdMs + 50)); // hold, then it starts over
    expect(demo().textContent).not.toContain('"user": "ada",');
  });

  it("shows the finished before/after at once, with no timers, for reduced motion", () => {
    setReducedMotion(true);
    render(<Intro compact={false} />);
    expect(demo().textContent).toContain(INTRO.demo.before);
    expect(demo()).toHaveTextContent('"user": "ada",');
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops its timers when it goes away", () => {
    const { unmount } = render(<Intro compact={false} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Intro (compact, once there is input)", () => {
  it("shrinks to one line without the headline, facts or demo", () => {
    render(<Intro compact />);
    expect(screen.getByText(INTRO.compact[0])).toBeInTheDocument();
    expect(screen.getByText(INTRO.compact[1])).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByTestId("intro-demo")).toBeNull();
    expect(vi.getTimerCount()).toBe(0); // the demo is not running behind the scenes
  });
});
