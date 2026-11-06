// All localStorage access goes through here. Storage can throw (private mode,
// blocked site data), and the app must keep working when it does.
// Only preferences are stored here, never what the user pastes.

import type { FormatId } from "@/formats/types";

export const STORAGE_KEYS = {
  lastFormat: "formatly:lastFormat",
  railCollapsed: "formatly:railCollapsed",
} as const;

/** Where one format's settings live, stored as JSON, e.g. `{"dialect":"mysql"}`. */
export function settingsKey(id: FormatId): string {
  return `formatly:settings:${id}`;
}

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the preference just won't be remembered.
  }
}
