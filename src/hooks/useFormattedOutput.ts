"use client";

import { useEffect, useRef, useState } from "react";
import { runFormatter } from "@/formats/runFormatter";
import type { FormatError, FormatId, FormatOptions } from "@/formats/types";

/** How long to wait after the last keystroke before formatting. */
export const FORMAT_DEBOUNCE_MS = 300;

export type OutputState =
  | { status: "empty" }
  | { status: "ok"; output: string }
  | { status: "error"; error: FormatError };

const EMPTY: OutputState = { status: "empty" };

/**
 * Formats `input` shortly after the user stops typing.
 * Results that arrive after the input or format has changed are dropped,
 * so a slow old result can never overwrite a newer one.
 */
export function useFormattedOutput(id: FormatId, input: string, options?: FormatOptions): OutputState {
  // Each result remembers which format produced it, so switching formats
  // never shows the old format's output in the new pane.
  const [state, setState] = useState<{ id: FormatId; value: OutputState }>({ id, value: EMPTY });
  const latestRequest = useRef(0);
  // null until the first run. Switching routes remounts the page, so a
  // fresh mount means the user just opened (or came back to) this format.
  const lastFormat = useRef<FormatId | null>(null);
  const sqlDialect = options?.sqlDialect;

  useEffect(() => {
    // Any change makes in-flight results stale.
    const request = ++latestRequest.current;
    const formatChanged = lastFormat.current !== id;
    lastFormat.current = id;

    if (isBlank(input)) {
      // The return below already shows EMPTY; this just drops the old result
      // so it can't flash back when the user starts typing again.
      const timer = setTimeout(() => setState({ id, value: EMPTY }), 0);
      return () => clearTimeout(timer);
    }

    // Typing waits for a pause; opening or switching format formats right away.
    const delay = formatChanged ? 0 : FORMAT_DEBOUNCE_MS;
    const timer = setTimeout(async () => {
      let next: OutputState;
      try {
        const result = await runFormatter(id, input, sqlDialect ? { sqlDialect } : undefined);
        next = result.ok ? { status: "ok", output: result.output } : { status: "error", error: result.error };
      } catch (err) {
        next = { status: "error", error: { message: err instanceof Error ? err.message : String(err), line: 1 } };
      }
      if (request === latestRequest.current) setState({ id, value: next });
    }, delay);

    return () => clearTimeout(timer);
  }, [id, input, sqlDialect]);

  if (isBlank(input) || state.id !== id) return EMPTY;
  return state.value;
}

function isBlank(text: string): boolean {
  return text.trim() === "";
}
