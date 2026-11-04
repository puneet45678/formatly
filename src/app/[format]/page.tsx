import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FORMATS, getFormat, isFormatId } from "@/formats/registry";
import { Workbench } from "@/components/Workbench";

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
  return <Workbench formatId={format} />;
}
