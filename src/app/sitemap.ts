import type { MetadataRoute } from "next";
import { FORMATS } from "@/formats/registry";
import { siteUrl } from "@/lib/site";

// A static export needs this said explicitly, or the build refuses the route.
export const dynamic = "force-static";

// Built once into sitemap.xml. Without NEXT_PUBLIC_SITE_URL there is no address
// to list, so the sitemap is empty rather than full of wrong URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 0.8 },
    ...FORMATS.map((f) => ({ url: `${base}/${f.id}`, changeFrequency: "monthly" as const, priority: 1 })),
  ];
}
