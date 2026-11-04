"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutsDialog } from "./ShortcutsDialog";

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL;

/** True while the user is typing somewhere, so single-key shortcuts stay out of the way. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest("input, textarea, select, [contenteditable]") !== null;
}

export function TopBar() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // "?" opens the shortcuts, as in most apps (but not while typing).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    // See-through on purpose: the kinetic grid runs under the top bar too.
    <header className="flex shrink-0 items-center justify-between border-b border-line2 px-[22px] py-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-[7px] border border-[#2e2e2e] bg-[#111] font-mono text-[10px] font-bold tracking-[-0.5px] text-k"
        >
          {"{ }"}
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">formatly</span>
      </div>
      <nav aria-label="Site" className="flex items-center gap-2">
        <RoundButton label="Shortcuts" pill="Shortcuts  ?" onClick={() => setShortcutsOpen(true)}>
          <Keyboard aria-hidden="true" className="size-[15px]" />
        </RoundButton>
        {githubUrl && (
          <RoundButton label="GitHub" pill="GitHub" href={githubUrl}>
            <GitHubMark />
          </RoundButton>
        )}
      </nav>
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}

interface RoundButtonProps {
  label: string;
  /** Text of the name pill shown on hover or keyboard focus. */
  pill: string;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}

/** A round icon button with the same name pill as the format capsule. */
function RoundButton({ label, pill, children, onClick, href }: RoundButtonProps) {
  const className = cn(
    "group relative grid size-8 place-items-center rounded-full border border-[#262626] bg-[#0f0f0f] text-[#a1a1a1]",
    "hover:border-[#3a3a3a] hover:text-text",
  );
  const pillEl = (
    <span
      data-pill
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-[calc(100%+8px)] right-0 z-30 rounded-md whitespace-pre",
        "bg-text px-2 py-1 text-[10px] font-bold tracking-[.06em] text-bg uppercase",
        "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none",
      )}
    >
      {pill}
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={className}>
        {children}
        {pillEl}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {children}
      {pillEl}
    </button>
  );
}

/** GitHub's mark (lucide no longer ships brand icons). */
function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[15px]" fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}
