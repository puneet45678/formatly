import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FORMATS, getFormat, isFormatId } from "@/formats/registry";
import { FormatRail } from "@/components/FormatRail";

// Only the six known formats exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return FORMATS.map((f) => ({ format: f.id }));
}

export async function generateMetadata({ params }: PageProps<"/[format]">): Promise<Metadata> {
  const { format } = await params;
  if (!isFormatId(format)) return {};
  return { title: `${getFormat(format).label} Formatter · formatly` };
}

export default async function FormatPage({ params }: PageProps<"/[format]">) {
  const { format } = await params;
  if (!isFormatId(format)) notFound();

  // Placeholder until Task 6 adds <Workbench>.
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <FormatRail activeId={format} />
      <main className="flex-1 p-[18px] text-muted">{getFormat(format).label}</main>
    </div>
  );
}
