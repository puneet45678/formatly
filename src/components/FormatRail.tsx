import Link from "next/link";
import { FORMATS } from "@/formats/registry";
import type { FormatId } from "@/formats/types";

/**
 * Desktop: a vertical list on the left. Below md (768px): a horizontal,
 * scrollable row of pills under the top bar.
 */
export function FormatRail({ activeId }: { activeId: FormatId }) {
  return (
    <nav
      aria-label="Formats"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-line2 bg-bg/60 px-3 py-2 md:w-[150px] md:flex-col md:gap-0.5 md:overflow-x-visible md:border-r md:border-b-0 md:px-2.5 md:py-3.5"
    >
      <span className="hidden px-2.5 pt-1 pb-2 text-[10px] tracking-[.08em] text-dim uppercase md:block">Formats</span>
      {FORMATS.map((format) => {
        const active = format.id === activeId;
        return (
          <Link
            key={format.id}
            href={`/${format.id}`}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] text-[12.5px] whitespace-nowrap ${
              active ? "bg-[#1c1c1c] text-text" : "text-muted hover:text-text"
            }`}
          >
            <span aria-hidden="true" className={`w-[22px] font-mono text-[10px] ${active ? "text-k" : "text-dim"}`}>
              {format.glyph}
            </span>
            {format.label}
          </Link>
        );
      })}
    </nav>
  );
}
