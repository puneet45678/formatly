// Content Security Policy for the static export.
//
// The site promises that nothing you paste leaves the page. connect-src 'self'
// is what makes the browser enforce that promise: fetch, XHR, WebSocket and
// sendBeacon to any other origin are blocked, even if a dependency or an
// injected script tries.
//
// A static export has no server, so the policy ships as a <meta> tag. That means
// no nonces (script-src needs 'unsafe-inline' for Next's inline bootstrap
// scripts) and no frame-ancestors or report-uri (ignored in <meta>). The policy
// therefore limits where data can go more than it blocks script injection;
// sanitizing Mermaid's SVG stays a separate control.
const DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // Next's inline bootstrap scripts; no nonce is possible without a server.
  "script-src": ["'self'", "'unsafe-inline'"],
  // Mermaid's SVG carries <style> elements; React writes style attributes.
  "style-src": ["'self'", "'unsafe-inline'"],
  // https: keeps Markdown preview's click-to-load remote images working.
  // That click is the one way content can reach another server.
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "worker-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'none'"],
};

export const CONTENT_SECURITY_POLICY = Object.entries(DIRECTIVES)
  .map(([name, sources]) => `${name} ${sources.join(" ")}`)
  .join("; ");
