import { GUIDES } from "@/content/guides";
import { FORMATS } from "@/formats/registry";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

// llms.txt: a plain summary of the site for AI assistants and the tools that
// read pages for them (https://llmstxt.org). Built once, from the same content
// as the pages, so it can't drift from them.
export const dynamic = "force-static";

export function llmsTxt(base: string | null = siteUrl()): string {
  const link = (path: string) => (base ? `${base}${path}` : path);
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Free, with no sign-up. Each format has its own page with the tool and a short guide. Formatting runs in the user's browser, and the page's Content Security Policy blocks requests to other sites, so pasted data is not sent anywhere.",
    "",
    "## Formatters",
    "",
    ...FORMATS.map((f) => `- [${GUIDES[f.id].title}](${link(`/${f.id}`)}): ${GUIDES[f.id].description}`),
    "",
    "## Questions",
    "",
    ...FORMATS.flatMap((f) =>
      GUIDES[f.id].faq.slice(1).map((q) => `- ${GUIDES[f.id].title}: ${q.question} ${q.answer}`),
    ),
    `- All formatters: ${GUIDES.json.faq[0].question} ${GUIDES.json.faq[0].answer}`,
    "",
  ];
  return lines.join("\n");
}

export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
