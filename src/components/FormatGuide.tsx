import Link from "next/link";
import { GUIDES } from "@/content/guides";
import { FORMATS, type RegisteredFormat } from "@/formats/registry";
import { SITE_NAME, siteUrl } from "@/lib/site";

/**
 * Serializes structured data for a <script type="application/ld+json"> tag.
 * "<" is escaped so no string in it can close the script element.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org description of one format page: the tool itself, and its questions and answers. */
export function formatStructuredData(format: RegisteredFormat, base: string | null = siteUrl()) {
  const guide = GUIDES[format.id];
  const url = base ? `${base}/${format.id}` : undefined;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${guide.title} · ${SITE_NAME}`,
      alternateName: guide.aliases,
      description: guide.description,
      ...(url ? { url } : {}),
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: guide.features,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];
}

/**
 * What a format page says about itself, below the tool: what it does, common
 * questions, and links to the other formatters. Rendered on the server, so it
 * is in the static HTML that search engines and chatbots read.
 */
export function FormatGuide({ format }: { format: RegisteredFormat }) {
  const guide = GUIDES[format.id];
  const others = FORMATS.filter((f) => f.id !== format.id);

  return (
    // The pane surface keeps the text readable over the animated background grid.
    // Bottom margin on phones leaves room for the floating format rail.
    <article
      aria-labelledby="guide-heading"
      className="mx-3 mt-6 mb-24 max-w-3xl rounded-[10px] border border-line bg-pane px-5 py-8 text-[14px] leading-relaxed text-muted backdrop-blur-sm md:mx-auto md:mb-12 md:w-full md:px-8"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(formatStructuredData(format)) }} />
      <h1 id="guide-heading" className="text-xl font-semibold tracking-[-0.01em] text-text">
        {guide.heading}
      </h1>
      <p className="mt-3">{guide.intro}</p>

      <h2 className="mt-8 text-[15px] font-semibold text-text">What it does</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        {guide.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <h2 className="mt-8 text-[15px] font-semibold text-text">Questions</h2>
      <dl className="mt-3 space-y-4">
        {guide.faq.map(({ question, answer }) => (
          <div key={question}>
            <dt className="font-medium text-text">{question}</dt>
            <dd className="mt-1">{answer}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-[15px] font-semibold text-text">Other formatters</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {others.map((f) => (
          <li key={f.id}>
            <Link href={`/${f.id}`} className="chip inline-block">
              {GUIDES[f.id].title}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
