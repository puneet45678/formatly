"use client";

import { useEffect, useRef, useState } from "react";
import { runFormatter } from "@/formats/runFormatter";
import type { FailureReason, FormatError, FormatId, FormatOutcome, FormatSettings } from "@/formats/types";

/** How long to wait after the last keystroke before formatting. */
export const FORMAT_DEBOUNCE_MS = 300;

/**
 * How late a result may be, after its request was sent, before the pane says
 * "Formatting…" instead of showing the previous result as current. Small
 * inputs format in a few milliseconds and never reach it, so typing doesn't
 * flicker; a large Markdown or SQL paste (seconds) does.
 */
export const PENDING_AFTER_MS = 200;

/**
 * What the output pane shows.
 * - invalid: the input has a syntax error at a position (the editor marks that line).
 * - failed: we couldn't finish; nothing is wrong at any particular line.
 *   `retry` is present only when trying again can help (a crash or a failed
 *   download), not when the same input would just fail the same way.
 */
export type OutputState = (
  | { status: "empty" }
  | { status: "ok"; output: string }
  | { status: "invalid"; error: FormatError }
  | { status: "failed"; reason: FailureReason; message: string; retry?: () => void }
) & {
  /**
   * A newer result has been on its way for over PENDING_AFTER_MS, so what is
   * shown belongs to an earlier input (or, for "empty", nothing has arrived yet).
   * Absent rather than false, so a settled state reads exactly as before.
   */
  pending?: true;
};

const EMPTY: OutputState = { status: "empty" };

/** Failures worth a second attempt. A timeout or too-deep input would fail again. */
const RETRYABLE: ReadonlySet<FailureReason> = new Set(["crashed", "internal"]);

/**
 * Formats `input` shortly after the user stops typing.
 * Results that arrive after the input or format has changed are dropped,
 * so a slow old result can never overwrite a newer one.
 */
export function useFormattedOutput(id: FormatId, input: string, settings: FormatSettings): OutputState {
  // Each result remembers which format produced it, so switching formats
  // never shows the old format's output in the new pane.
  const [state, setState] = useState<{ id: FormatId; value: OutputState }>({ id, value: EMPTY });
  // Bumped by retry() to run the same input again.
  const [attempt, setAttempt] = useState(0);
  // True while a request has been out for longer than PENDING_AFTER_MS without an answer.
  const [slow, setSlow] = useState(false);
  const latestRequest = useRef(0);
  // The newest request that has been answered, so its slow timer knows not to fire.
  const answeredRequest = useRef(0);
  // null until the first run. Switching routes remounts the page, so a
  // fresh mount means the user just opened (or came back to) this format.
  const lastFormat = useRef<FormatId | null>(null);
  const lastAttempt = useRef(attempt);
  // Callers may pass a new but equal settings object on every render. Comparing
  // the JSON text instead of the object means only a real change formats again.
  const settingsJson = JSON.stringify(settings);

  useEffect(() => {
    // Any change makes in-flight results stale.
    const request = ++latestRequest.current;
    const formatChanged = lastFormat.current !== id;
    const retrying = lastAttempt.current !== attempt;
    lastFormat.current = id;
    lastAttempt.current = attempt;

    if (isBlank(input)) {
      // The return below already shows EMPTY; this just drops the old result
      // so it can't flash back when the user starts typing again.
      const timer = setTimeout(() => {
        setState({ id, value: EMPTY });
        setSlow(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Typing waits for a pause; opening a format, switching to it or retrying runs right away.
    const delay = formatChanged || retrying ? 0 : FORMAT_DEBOUNCE_MS;
    const timer = setTimeout(async () => {
      let outcome: FormatOutcome;
      try {
        outcome = await runFormatter(id, input, JSON.parse(settingsJson) as FormatSettings);
      } catch (err) {
        // runFormatter never rejects by contract; this is a last-resort guard.
        outcome = { kind: "failed", reason: "internal", message: err instanceof Error ? err.message : String(err) };
      }
      if (request !== latestRequest.current) return;
      answeredRequest.current = request;
      setSlow(false);
      const next = toState(outcome, () => setAttempt((n) => n + 1));
      // A cancelled job leaves whatever is on screen alone.
      if (next) setState({ id, value: next });
    }, delay);
    // Not cleared by the next request: if this one was slow, the screen is still out of date.
    const slowTimer = setTimeout(() => {
      if (request === latestRequest.current && answeredRequest.current !== request) setSlow(true);
    }, delay + PENDING_AFTER_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(slowTimer);
    };
  }, [id, input, settingsJson, attempt]);

  if (isBlank(input)) return EMPTY;
  // Another format's result never shows here; while this format's first result is late, say so.
  const value = state.id === id ? state.value : EMPTY;
  return slow ? { ...value, pending: true } : value;
}

function toState(outcome: FormatOutcome, retry: () => void): OutputState | null {
  switch (outcome.kind) {
    case "ok":
      return { status: "ok", output: outcome.output };
    case "invalid":
      return { status: "invalid", error: outcome.error };
    case "failed":
      return RETRYABLE.has(outcome.reason)
        ? { status: "failed", reason: outcome.reason, message: outcome.message, retry }
        : { status: "failed", reason: outcome.reason, message: outcome.message };
    case "cancelled":
      return null;
  }
}

function isBlank(text: string): boolean {
  return text.trim() === "";
}
