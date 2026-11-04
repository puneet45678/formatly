"use client";

import { useEffect, useRef } from "react";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { action: "Copy output", keys: "⌘/Ctrl + Shift + C" },
  // Tab indents inside the editor, so leaving it takes Esc first.
  { action: "Leave the editor", keys: "Esc, then Tab" },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Use the native modal (focus trap, Esc to close) where the browser has it.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      hidden={!open}
      aria-labelledby="shortcuts-title"
      className="m-auto w-[min(360px,calc(100vw-32px))] rounded-xl border border-line bg-[#111] p-0 text-text"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="shortcuts-title" className="text-sm font-semibold">
          Keyboard shortcuts
        </h2>
        <button type="button" onClick={onClose} className="text-xs text-muted hover:text-text">
          Close
        </button>
      </div>
      <ul className="px-4 py-3 text-[13px]">
        {SHORTCUTS.map((s) => (
          <li key={s.action} className="flex justify-between gap-4 py-1">
            <span>{s.action}</span>
            <kbd className="font-mono text-xs text-muted">{s.keys}</kbd>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
