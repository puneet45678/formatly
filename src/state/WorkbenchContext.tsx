"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FORMATS, SQL_DIALECTS } from "@/formats/registry";
import type { FormatId, SqlDialect } from "@/formats/types";
import { STORAGE_KEYS, readStored, writeStored } from "@/lib/storage";

interface WorkbenchState {
  /** What the user typed for each format. Lives in memory only. */
  inputs: Record<FormatId, string>;
  setInput: (id: FormatId, text: string) => void;
  sqlDialect: SqlDialect;
  setSqlDialect: (dialect: SqlDialect) => void;
  /** Format capsule closed to symbols only (desktop; phones always show symbols). */
  railCollapsed: boolean;
  toggleRail: () => void;
}

const WorkbenchContext = createContext<WorkbenchState | null>(null);

const emptyInputs = Object.fromEntries(FORMATS.map((f) => [f.id, ""])) as Record<FormatId, string>;

function isSqlDialect(value: unknown): value is SqlDialect {
  return SQL_DIALECTS.some((d) => d.id === value);
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState(emptyInputs);
  const [sqlDialect, setSqlDialectState] = useState<SqlDialect>("sql");
  // The format capsule starts closed (symbols only) until the user opens it.
  const [railCollapsed, setRailCollapsed] = useState(true);

  // Read after mount so the first render matches the static HTML.
  // (Reading during render would make the server and browser HTML differ.)
  useEffect(() => {
    const storedDialect = readStored(STORAGE_KEYS.sqlDialect);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser storage after hydration */
    if (isSqlDialect(storedDialect)) setSqlDialectState(storedDialect);
    if (readStored(STORAGE_KEYS.railCollapsed) === "false") setRailCollapsed(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const toggleRail = useCallback(() => {
    setRailCollapsed((collapsed) => {
      // Writing the same value twice (React may re-run this in dev) is harmless.
      writeStored(STORAGE_KEYS.railCollapsed, String(!collapsed));
      return !collapsed;
    });
  }, []);

  // ⌘\ (Mac) or Ctrl+\ (Windows/Linux) toggles the format menu, as in Notion.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleRail();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleRail]);

  const setInput = useCallback((id: FormatId, text: string) => {
    setInputs((prev) => ({ ...prev, [id]: text }));
  }, []);

  const setSqlDialect = useCallback((dialect: SqlDialect) => {
    setSqlDialectState(dialect);
    writeStored(STORAGE_KEYS.sqlDialect, dialect);
  }, []);

  const value = useMemo(
    () => ({ inputs, setInput, sqlDialect, setSqlDialect, railCollapsed, toggleRail }),
    [inputs, setInput, sqlDialect, setSqlDialect, railCollapsed, toggleRail],
  );

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench(): WorkbenchState {
  const state = useContext(WorkbenchContext);
  if (!state) throw new Error("useWorkbench must be used inside <WorkbenchProvider>");
  return state;
}

export function rememberFormat(id: FormatId): void {
  writeStored(STORAGE_KEYS.lastFormat, id);
}
