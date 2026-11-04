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
}

const WorkbenchContext = createContext<WorkbenchState | null>(null);

const emptyInputs = Object.fromEntries(FORMATS.map((f) => [f.id, ""])) as Record<FormatId, string>;

function isSqlDialect(value: unknown): value is SqlDialect {
  return SQL_DIALECTS.some((d) => d.id === value);
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState(emptyInputs);
  const [sqlDialect, setSqlDialectState] = useState<SqlDialect>("sql");

  // Read after mount so the first render matches the static HTML.
  useEffect(() => {
    const stored = readStored(STORAGE_KEYS.sqlDialect);
    if (isSqlDialect(stored)) setSqlDialectState(stored);
  }, []);

  const setInput = useCallback((id: FormatId, text: string) => {
    setInputs((prev) => ({ ...prev, [id]: text }));
  }, []);

  const setSqlDialect = useCallback((dialect: SqlDialect) => {
    setSqlDialectState(dialect);
    writeStored(STORAGE_KEYS.sqlDialect, dialect);
  }, []);

  const value = useMemo(
    () => ({ inputs, setInput, sqlDialect, setSqlDialect }),
    [inputs, setInput, sqlDialect, setSqlDialect],
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
