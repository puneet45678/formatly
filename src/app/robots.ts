import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// A static export needs this said explicitly, or the build refuses the route.
export const dynamic = "force-static";

/**
 * Crawlers that build AI assistants' answers and search features. Everything is
 * allowed already; naming them makes the choice explicit, so a later rule that
 * blocks one has to be deliberate.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: [...AI_CRAWLERS], allow: "/" },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
