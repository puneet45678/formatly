"use client";

import { useEffect, useState } from "react";

export const DEMO_TIMING = {
  /** Delay before each typed character. */
  typeMs: 35,
  /** Pause after typing, before the tidied version appears. */
  settleMs: 350,
  /** How long the finished before/after stays up. */
  holdMs: 3200,
  /** Empty pause before it starts again. */
  restMs: 600,
} as const;

export interface DemoFrame {
  /** The first `typed` characters of the text so far. */
  typed: string;
  /** The tidied version is showing. */
  tidy: boolean;
}

/**
 * Types `text` out, shows the tidied result, holds, then starts over, forever.
 * With reduced motion it shows the finished state straight away and runs no timers.
 */
export function useDemoLoop(text: string, enabled = true): DemoFrame {
  const [frame, setFrame] = useState<DemoFrame>({ typed: "", tidy: false });

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- motion preference is only known in the browser
      setFrame({ typed: text, tidy: true });
      return;
    }

    let length = 0;
    let timer: ReturnType<typeof setTimeout>;

    const type = () => {
      length++;
      setFrame({ typed: text.slice(0, length), tidy: false });
      timer = setTimeout(length < text.length ? type : settle, length < text.length ? DEMO_TIMING.typeMs : DEMO_TIMING.settleMs);
    };
    const settle = () => {
      setFrame({ typed: text, tidy: true });
      timer = setTimeout(restart, DEMO_TIMING.holdMs);
    };
    const restart = () => {
      length = 0;
      setFrame({ typed: "", tidy: false });
      timer = setTimeout(type, DEMO_TIMING.restMs);
    };

    timer = setTimeout(type, DEMO_TIMING.typeMs);
    return () => clearTimeout(timer);
  }, [text, enabled]);

  return frame;
}
