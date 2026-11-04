"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { FORMATS } from "@/formats/registry";
import type { FormatId } from "@/formats/types";
import { cn } from "@/lib/utils";

interface FormatRailProps {
  activeId: FormatId;
  /** Desktop only: shrink to a strip of format symbols. */
  collapsed?: boolean;
  onToggle?: () => void;
}

/**
 * Desktop: a vertical list on the left that can collapse to a strip of
 * format symbols. Below md (768px): a horizontal, scrollable row of pills
 * under the top bar (never collapsed there).
 */
export function FormatRail({ activeId, collapsed = false, onToggle }: FormatRailProps) {
  const activeLink = useRef<HTMLAnchorElement>(null);

  // On phones the row scrolls sideways; make sure the selected pill is on screen.
  useEffect(() => {
    activeLink.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <nav
      aria-label="Formats"
      className={cn(
        "flex shrink-0 gap-1 overflow-x-auto border-b border-line2 bg-bg/60 px-3 py-2",
        "md:flex-col md:gap-0.5 md:overflow-x-visible md:border-r md:border-b-0 md:py-3.5",
        "md:transition-[width] md:duration-150 motion-reduce:transition-none",
        collapsed ? "md:w-[52px] md:px-1.5" : "md:w-[150px] md:px-2.5",
      )}
    >
      <div className={cn("hidden items-center pb-2 md:flex", collapsed ? "justify-center" : "justify-between pl-2.5")}>
        {!collapsed && <span className="text-[10px] tracking-[.08em] text-dim uppercase">Formats</span>}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand format menu" : "Collapse format menu"}
            title={collapsed ? "Expand (⌘\\)" : "Collapse (⌘\\)"}
            className="rounded-md p-1 text-dim hover:bg-[#1c1c1c] hover:text-text"
          >
            <ToggleIcon aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      {FORMATS.map((format) => {
        const active = format.id === activeId;
        return (
          <Link
            key={format.id}
            href={`/${format.id}`}
            ref={active ? activeLink : undefined}
            aria-current={active ? "page" : undefined}
            title={collapsed ? format.label : undefined}
            className={cn(
              "flex shrink-0 items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] text-[12.5px] whitespace-nowrap",
              collapsed && "md:justify-center md:px-0",
              active ? "bg-[#1c1c1c] text-text" : "text-muted hover:text-text",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("w-[22px] font-mono text-[10px]", collapsed && "md:text-center", active ? "text-k" : "text-dim")}
            >
              {format.glyph}
            </span>
            <span className={cn(collapsed && "md:sr-only")}>{format.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
