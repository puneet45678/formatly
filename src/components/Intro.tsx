"use client";

import { Crosshair, Lock, Zap } from "lucide-react";
import { INTRO } from "@/content/site";
import { useDemoLoop } from "@/hooks/useDemoLoop";

const FACT_ICONS = [Lock, Crosshair, Zap];

/**
 * The same short introduction on every format page, above the panes. Information only: no
 * buttons. Once there is something in the input it shrinks to one line so the tool gets the room.
 */
export function Intro({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <p className="mx-0.5 mb-2.5 flex flex-wrap items-center gap-x-2.5 text-[12.5px] text-muted">
        <span className="font-medium text-text">{INTRO.compact[0]}</span>
        <span aria-hidden="true" className="text-[#3f3f3f]">
          ·
        </span>
        <span>{INTRO.compact[1]}</span>
      </p>
    );
  }
  return <FullIntro />;
}

function FullIntro() {
  const { typed, tidy } = useDemoLoop(INTRO.demo.before);
  return (
    <div className="mb-3.5 grid items-center gap-6 px-1 pt-1 pb-1.5 md:grid-cols-[1.15fr_.85fr]">
      <div>
        <h1 className="text-[26px] leading-[1.12] font-semibold tracking-[-0.028em] md:text-[28px]">
          {INTRO.headline[0]} <br />
          <span className="bg-gradient-to-r from-k to-[#a7f3d0] bg-clip-text text-transparent">{INTRO.headline[1]}</span>
        </h1>
        <p className="mt-2 max-w-[56ch] text-[13.5px] leading-relaxed text-muted">{INTRO.lead}</p>
        <ul className="mt-3.5 hidden flex-wrap gap-2 sm:flex">
          {INTRO.facts.map((fact, i) => {
            const Icon = FACT_ICONS[i];
            return (
              <li
                key={fact}
                className="inline-flex items-center gap-[7px] rounded-full border border-line bg-pane px-[11px] py-[5px] text-[11.5px] text-[#bdbdbd]"
              >
                <Icon aria-hidden="true" className="size-[15px] text-k" />
                {fact}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Decoration: it only repeats what the page already says, so screen readers skip it. */}
      <div
        data-testid="intro-demo"
        aria-hidden="true"
        className="hidden gap-1.5 rounded-xl border border-line bg-pane p-3 font-mono text-[11.5px] leading-normal md:grid"
      >
        <div>
          <i className="mb-0.5 block text-[9px] font-semibold tracking-[.09em] text-dim uppercase not-italic">before</i>
          <code className="block min-h-[1.5em] whitespace-pre text-[#6b7280]">
            {typed}
            {!tidy && <span className="caret-blink ml-px inline-block h-3 w-1.5 bg-k align-[-2px]" />}
          </code>
        </div>
        <div className="text-center leading-none text-k">↓</div>
        <div>
          <i className="mb-0.5 block text-[9px] font-semibold tracking-[.09em] text-dim uppercase not-italic">after</i>
          <code className="block min-h-[7.5em] whitespace-pre text-text">{tidy ? INTRO.demo.after : ""}</code>
        </div>
      </div>
    </div>
  );
}
