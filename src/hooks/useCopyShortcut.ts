"use client";

import { useEffect, useRef } from "react";

/** Calls onCopy on ⌘+Shift+C (Mac) or Ctrl+Shift+C (Windows/Linux). */
export function useCopyShortcut(onCopy: () => void, enabled: boolean): void {
  // Keep the latest callback without re-adding the listener on every render.
  const callback = useRef(onCopy);
  useEffect(() => {
    callback.current = onCopy;
  });

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        callback.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
