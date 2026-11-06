"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FORMATS, defaultSettings, sanitizeSettings } from "@/formats/registry";
import type { FormatId, FormatSettings } from "@/formats/types";
import { STORAGE_KEYS, readStored, settingsKey, writeStored } from "@/lib/storage";
import { DEFAULT_LAYOUT, sanitizeLayout, type SplitLayout } from "@/lib/split";

interface WorkbenchState {
  /** What the user typed for each format. Lives in memory only. */
  inputs: Record<FormatId, string>;
  setInput: (id: FormatId, text: string) => void;
  /** Each format's chosen settings (e.g. the SQL dialect). Remembered per format. */
  settings: Record<FormatId, FormatSettings>;
  setSetting: (id: FormatId, key: string, value: string) => void;
  /** Format capsule closed to symbols only (desktop; phones always show symbols). */
  railCollapsed: boolean;
  toggleRail: () => void;
  /** How the input and output panes share the width (desktop). Remembered. */
  layout: SplitLayout;
  setLayout: (layout: SplitLayout) => void;
}

const WorkbenchContext = createContext<WorkbenchState | null>(null);

/** One value per format, e.g. an empty input for each. */
function byFormat<T>(make: (id: FormatId) => T): Record<FormatId, T> {
  return Object.fromEntries(FORMATS.map((f) => [f.id, make(f.id)])) as Record<FormatId, T>;
}

const emptyInputs = byFormat(() => "");
const initialSettings = byFormat(defaultSettings);

/** A format's stored settings, falling back to defaults for anything missing, unknown or corrupt. */
function readStoredSettings(id: FormatId): FormatSettings {
  const stored = readStored(settingsKey(id));
  if (stored === null) return defaultSettings(id);
  try {
    return sanitizeSettings(id, JSON.parse(stored));
  } catch {
    return defaultSettings(id); // not valid JSON
  }
}

/** The stored layout, or the default when it is missing or corrupt. */
function readStoredLayout(): SplitLayout {
  const stored = readStored(STORAGE_KEYS.layout);
  if (stored === null) return DEFAULT_LAYOUT;
  try {
    return sanitizeLayout(JSON.parse(stored));
  } catch {
    return DEFAULT_LAYOUT; // not valid JSON
  }
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState(emptyInputs);
  const [settings, setSettings] = useState(initialSettings);
  // The format capsule starts closed (symbols only) until the user opens it.
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [layout, setLayoutState] = useState(DEFAULT_LAYOUT);

  // Read after mount so the first render matches the static HTML.
  // (Reading during render would make the server and browser HTML differ.)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser storage after hydration */
    setSettings(byFormat(readStoredSettings));
    if (readStored(STORAGE_KEYS.railCollapsed) === "false") setRailCollapsed(false);
    setLayoutState(readStoredLayout());
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

  const setSetting = useCallback((id: FormatId, key: string, value: string) => {
    setSettings((prev) => {
      // Sanitizing drops a key or value the format doesn't define.
      const next = sanitizeSettings(id, { ...prev[id], [key]: value });
      // Writing the same value twice (React may re-run this in dev) is harmless.
      writeStored(settingsKey(id), JSON.stringify(next));
      return { ...prev, [id]: next };
    });
  }, []);

  const setLayout = useCallback((next: SplitLayout) => {
    const clean = sanitizeLayout(next);
    setLayoutState(clean);
    writeStored(STORAGE_KEYS.layout, JSON.stringify(clean));
  }, []);

  const value = useMemo(
    () => ({ inputs, setInput, settings, setSetting, railCollapsed, toggleRail, layout, setLayout }),
    [inputs, setInput, settings, setSetting, railCollapsed, toggleRail, layout, setLayout],
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
