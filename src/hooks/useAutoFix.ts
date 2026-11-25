"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFormat } from "@/formats/registry";
import { runRepair } from "@/formats/runFormatter";
import type { FormatId, FormatSettings } from "@/formats/types";

/**
 * Where an automatic fix stands, for the text currently in the input.
 * - ready: a fix can be offered.
 * - fixing: one is running (in the worker for text formats).
 * - unfixable: it couldn't be fixed; the text was left as it was.
 * - fixed: the input is the result of a fix (undo with Ctrl+Z in the input).
 */
export type FixState =
  | { status: "ready" }
  | { status: "fixing" }
  | { status: "unfixable"; message: string }
  | { status: "fixed" };

export interface AutoFix {
  state: FixState;
  run: () => void;
}

const READY: FixState = { status: "ready" };

/**
 * The "Fix automatically" action for a format that has a repairer, or
 * undefined for one that doesn't, so the UI never has to name a format.
 *
 * A state belongs to the exact text it was reached on: once the input changes,
 * a fix in flight is ignored (it was fixing older text) and the offer is ready
 * again. `apply` puts the fixed text into the input.
 */
export function useAutoFix(
  formatId: FormatId,
  input: string,
  settings: FormatSettings,
  apply: (text: string) => void,
): AutoFix | undefined {
  const [record, setRecord] = useState<{ formatId: FormatId; input: string; state: FixState } | null>(null);
  const latest = useRef({ formatId, input });
  useEffect(() => {
    latest.current = { formatId, input };
  });

  const run = useCallback(async () => {
    const started = { formatId, input };
    setRecord({ ...started, state: { status: "fixing" } });
    const outcome = await runRepair(formatId, input, settings);
    // The text changed while fixing (typing, a format switch): this fix no longer applies.
    if (latest.current.formatId !== started.formatId || latest.current.input !== started.input) return;
    switch (outcome.kind) {
      case "repaired":
        apply(outcome.output);
        setRecord({ formatId, input: outcome.output, state: { status: "fixed" } });
        break;
      case "cancelled":
        setRecord(null);
        break;
      case "unrepairable":
      case "failed":
        setRecord({ ...started, state: { status: "unfixable", message: outcome.message } });
        break;
    }
  }, [formatId, input, settings, apply]);

  if (!getFormat(formatId).repair) return undefined;
  const state = record && record.formatId === formatId && record.input === input ? record.state : READY;
  return { state, run };
}
