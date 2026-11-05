// Where the site is published. Set NEXT_PUBLIC_SITE_URL (e.g. https://formatly.dev)
// in the deployment's environment. Canonical links, the sitemap and absolute
// Open Graph URLs need it; without it they are left out rather than pointing
// at a guessed or local address, which would tell search engines the wrong page.

export const SITE_NAME = "formatly";

export const SITE_DESCRIPTION =
  "Format and validate JSON, YAML, XML, SQL and Markdown, and draw Mermaid diagrams, in one place. Everything runs in your browser: nothing you paste is sent anywhere.";

/** The site's origin and base path without a trailing slash, or null when not configured or not an http(s) URL. */
export function siteUrl(value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}
