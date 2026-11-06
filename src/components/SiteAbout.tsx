import { ABOUT } from "@/content/site";

/**
 * The text below the tool, the same on every format page. Plain HTML (questions are native
 * <details>), so it is in the static page for search and screen readers and needs no script.
 */
export function SiteAbout() {
  return (
    <section aria-labelledby="about-title" className="mx-auto w-full max-w-[760px] px-[22px] pt-14 pb-28 text-[13.5px] leading-relaxed text-muted md:pb-16">
      <h2 id="about-title" className="text-xl font-semibold tracking-[-0.01em] text-text">
        {ABOUT.title}
      </h2>
      <p className="mt-2 max-w-[62ch]">{ABOUT.lead}</p>

      <h3 className="mt-6 mb-2.5 text-[11px] font-semibold tracking-[.09em] text-k uppercase">{ABOUT.heading.features}</h3>
      <ul className="grid gap-2">
        {ABOUT.features.map((feature) => (
          <li key={feature.lead} className="relative pl-[18px] before:absolute before:top-[.62em] before:left-0.5 before:size-1.5 before:rounded-[2px] before:bg-k">
            <b className="font-medium text-text">{feature.lead}</b> {feature.text}
          </li>
        ))}
      </ul>

      <h3 className="mt-6 mb-2.5 text-[11px] font-semibold tracking-[.09em] text-k uppercase">{ABOUT.heading.questions}</h3>
      <div className="border-b border-line">
        {ABOUT.questions.map(({ question, answer }) => (
          <details key={question} className="group border-t border-line py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-text [&::-webkit-details-marker]:hidden">
              {question}
              <span aria-hidden="true" className="font-mono text-k group-open:hidden">+</span>
              <span aria-hidden="true" className="hidden font-mono text-k group-open:inline">–</span>
            </summary>
            <p className="mt-2 max-w-[64ch]">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
