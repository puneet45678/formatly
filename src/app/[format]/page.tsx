import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FORMATS, getFormat, isFormatId } from "@/formats/registry";
import { FormatGuide } from "@/components/FormatGuide";
import { Workbench } from "@/components/Workbench";
import { GUIDES } from "@/content/guides";
import { SITE_NAME, siteUrl } from "@/lib/site";

// Only the six known formats exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return FORMATS.map((f) => ({ format: f.id }));
}

export async function generateMetadata({ params }: PageProps<"/[format]">): Promise<Metadata> {
  const { format } = await params;
  if (!isFormatId(format)) return {};
  const guide = GUIDES[format];
  const path = `/${format}`;
  return {
    title: guide.title,
    description: guide.description,
    keywords: [guide.title, ...guide.aliases],
    // Canonical and og:url need the site's address, so they are left out until it is configured.
    ...(siteUrl() ? { alternates: { canonical: path } } : {}),
    // A page's openGraph replaces the layout's rather than merging with it, so siteName and type are repeated here.
    openGraph: {
      title: guide.title,
      description: guide.description,
      siteName: SITE_NAME,
      type: "website",
      ...(siteUrl() ? { url: path } : {}),
    },
    twitter: { title: guide.title, description: guide.description },
  };
}

export default async function FormatPage({ params }: PageProps<"/[format]">) {
  const { format } = await params;
  if (!isFormatId(format)) notFound();
  return (
    <>
      {/* The tool fills the visible area; the guide is below it, for readers and search engines. */}
      <div className="flex h-full min-h-0 shrink-0 flex-col">
        <Workbench formatId={format} />
      </div>
      <FormatGuide format={getFormat(format)} />
    </>
  );
}
