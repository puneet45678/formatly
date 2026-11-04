"use client";

import { useState } from "react";
import { ShortcutsDialog } from "./ShortcutsDialog";

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL;

export function TopBar() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    // See-through on purpose: the kinetic grid runs under the top bar too.
    <header className="flex shrink-0 items-center justify-between border-b border-line2 px-[22px] py-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden="true" className="inline-block size-[18px] rounded-[5px] bg-linear-135 from-white to-[#777]" />
        formatly
      </div>
      <nav className="flex gap-[18px] text-[12.5px] text-muted">
        <button type="button" className="hover:text-text" onClick={() => setShortcutsOpen(true)}>
          Shortcuts
        </button>
        {githubUrl && (
          <a className="hover:text-text" href={githubUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        )}
      </nav>
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}
