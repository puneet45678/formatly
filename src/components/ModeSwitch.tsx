"use client";

import { ChevronDown } from "lucide-react";
import type { WorkbenchMode } from "@/state/WorkbenchContext";

const MODES: { id: WorkbenchMode; label: string }[] = [
  { id: "format", label: "Format" },
  { id: "compare", label: "Compare" },
];

/**
 * Chooses between formatting the input and comparing two versions. It sits
 * between the two panes: on the divider in format mode, in the middle of the
 * header in compare mode. A native select, so keyboards and screen readers
 * get the platform's own control.
 */
export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: WorkbenchMode;
  onChange: (mode: WorkbenchMode) => void;
}) {
  return (
    <label className="relative inline-flex items-center rounded-full border border-line bg-[#141414] shadow-[0_0_0_4px_var(--bg)]">
      <span className="sr-only">Mode</span>
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as WorkbenchMode)}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-[3px] pr-6 pl-3 text-[11.5px] font-medium text-text outline-none focus-visible:ring-1 focus-visible:ring-k"
      >
        {MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2 size-3 text-muted"
      />
    </label>
  );
}
