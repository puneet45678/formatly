"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { FORMATS } from "@/formats/registry";
import type { FormatId } from "@/formats/types";
import { cn } from "@/lib/utils";

interface FormatRailProps {
  activeId: FormatId;
  /** Desktop only: closed = symbols only; open = symbols with names. */
  collapsed?: boolean;
  onToggle?: () => void;
  /** Renders nothing (the expanded output uses the full width). */
  hidden?: boolean;
}

/**
 * The format menu: a floating capsule.
 * Desktop: on the left, vertically centered. Closed it shows just the format
 * symbols (hover or focus shows a name pill); open it widens to show names.
 * Phones: a floating bar at the bottom of the screen, symbols only.
 */
export function FormatRail({ activeId, collapsed = true, onToggle, hidden = false }: FormatRailProps) {
  const activeLink = useRef<HTMLAnchorElement>(null);

  // If the phone bar ever needs to scroll sideways, keep the selected format on screen.
  useEffect(() => {
    activeLink.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  if (hidden) return null;

  return (
    <nav
      aria-label="Formats"
      className={cn(
        // Phone: bottom bar
        "fixed bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full",
        "border border-[#262626] bg-[#111]/90 p-1.5 shadow-[0_16px_40px_-14px_rgba(0,0,0,.85)] backdrop-blur-md",
        // Desktop: capsule on the left that widens when open
        "md:absolute md:top-1/2 md:bottom-auto md:left-4 md:translate-x-0 md:-translate-y-1/2 md:flex-col md:gap-[3px] md:overflow-visible",
        "md:transition-[width,border-radius] md:duration-200 md:ease-out motion-reduce:transition-none",
        collapsed ? "md:w-[50px] md:rounded-[25px]" : "md:w-[164px] md:rounded-[22px]",
      )}
    >
      {onToggle && (
        <div className="hidden md:block">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand format menu" : "Collapse format menu"}
            title={collapsed ? "Show names (⌘\\)" : "Hide names (⌘\\)"}
            className={cn(
              "flex h-[30px] w-full items-center rounded-full text-dim hover:text-text",
              collapsed ? "justify-center" : "justify-between pr-1.5 pl-3",
            )}
          >
            {!collapsed && <span className="text-[10px] tracking-[.08em] uppercase">Formats</span>}
            <ToggleIcon aria-hidden="true" className="size-[15px]" />
          </button>
          <div className="mx-1.5 mt-0.5 mb-[3px] h-px bg-line" />
        </div>
      )}
      {FORMATS.map((format) => {
        const active = format.id === activeId;
        return (
          <Link
            key={format.id}
            href={`/${format.id}`}
            ref={active ? activeLink : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-[38px] w-[38px] shrink-0 items-center rounded-full transition-colors md:w-auto",
              active ? "bg-text text-bg" : "text-muted hover:bg-[#1c1c1c] hover:text-text",
            )}
          >
            <span aria-hidden="true" className="w-[38px] shrink-0 text-center font-mono text-[11px]">
              {format.glyph}
            </span>
            <span
              data-name
              className={cn("text-[12.5px] whitespace-nowrap sr-only", !collapsed && "md:not-sr-only", active && "font-semibold")}
            >
              {format.label}
            </span>
            {collapsed && (
              <span
                data-pill
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-1/2 left-[calc(100%+14px)] z-30 hidden -translate-y-1/2 rounded-[7px] md:block",
                  "bg-text px-[9px] py-[5px] text-[10.5px] font-bold tracking-[.06em] whitespace-nowrap text-bg uppercase",
                  "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none",
                )}
              >
                {format.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
