import type { Metadata } from "next";
import Link from "next/link";
import { RootRedirect } from "@/components/RootRedirect";
import { GUIDES } from "@/content/guides";
import { FORMATS } from "@/formats/registry";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

export const metadata: Metadata = siteUrl() ? { alternates: { canonical: "/" } } : {};

/**
 * "/" sends people on to the format they used last (RootRedirect). Its HTML is
 * an index of every formatter, so search engines, chatbots and anyone without
 * JavaScript find real content and links here instead of an empty page.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 text-[14px] leading-relaxed text-muted">
      <RootRedirect />
      <h1 className="text-xl font-semibold tracking-[-0.01em] text-text">{SITE_NAME}: one place for everyday formatters</h1>
      <p className="mt-3">{SITE_DESCRIPTION}</p>
      <ul className="mt-8 space-y-4">
        {FORMATS.map((f) => (
          <li key={f.id}>
            <Link href={`/${f.id}`} className="font-medium text-text underline-offset-4 hover:underline">
              {GUIDES[f.id].title}
            </Link>
            <p className="mt-1">{GUIDES[f.id].description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
