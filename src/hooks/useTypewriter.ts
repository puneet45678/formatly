"use client";

import { useEffect, useState } from "react";

export interface TypewriterTiming {
  /** Delay before each letter appears. */
  typeMs: number;
  /** Delay before each letter is erased. */
  deleteMs: number;
  /** How long the full word stays up. */
  holdMs: number;
  /** Pause between erasing one word and typing the next. */
  gapMs: number;
}

const DEFAULT_TIMING: TypewriterTiming = { typeMs: 90, deleteMs: 45, holdMs: 1400, gapMs: 250 };

/**
 * Types each word, holds it, erases it, then moves to the next, forever.
 * Returns the text to show right now. With reduced motion it just shows the
 * first word and never changes.
 */
export function useTypewriter(words: readonly string[], timing: TypewriterTiming = DEFAULT_TIMING): string {
  const [text, setText] = useState("");
  const wordsKey = words.join("\u0000");
  const { typeMs, deleteMs, holdMs, gapMs } = timing;

  useEffect(() => {
    const list = wordsKey.split("\u0000");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- motion preference is only known in the browser
      setText(list[0]);
      return;
    }

    let wordIndex = 0;
    let length = 0;
    let timer: ReturnType<typeof setTimeout>;

    const type = () => {
      const word = list[wordIndex];
      length++;
      setText(word.slice(0, length));
      timer = length < word.length ? setTimeout(type, typeMs) : setTimeout(erase, holdMs + deleteMs);
    };

    const erase = () => {
      const word = list[wordIndex];
      length--;
      setText(word.slice(0, length));
      if (length > 0) {
        timer = setTimeout(erase, deleteMs);
      } else {
        wordIndex = (wordIndex + 1) % list.length;
        timer = setTimeout(type, gapMs + typeMs);
      }
    };

    timer = setTimeout(type, typeMs);
    return () => clearTimeout(timer);
  }, [wordsKey, typeMs, deleteMs, holdMs, gapMs]);

  return text;
}
