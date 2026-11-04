// All localStorage access goes through here. Storage can throw (private mode,
// blocked site data), and the app must keep working when it does.
// Only preferences are stored here, never what the user pastes.

export const STORAGE_KEYS = {
  lastFormat: "formatly:lastFormat",
  sqlDialect: "formatly:sqlDialect",
  railCollapsed: "formatly:railCollapsed",
} as const;

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
