"use client";

import { useState } from "react";
import Markdown, { defaultUrlTransform, type Components, type UrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImageOff } from "lucide-react";
import type { Element } from "hast";
import { FORMATS, type RegisteredFormat } from "@/formats/registry";
import { EmbeddedDiagram } from "./EmbeddedDiagram";

// Privacy: rendering an image URL makes the browser fetch it, which tells that
// server someone opened this content. So remote images wait for a click, and
// load without a referrer. Inline data: images never leave the page.

function isInlineImage(src: string) {
  return src.startsWith("data:image/");
}

function PreviewImage({ src, alt }: { src: string; alt: string }) {
  const [allowed, setAllowed] = useState(false);

  if (isInlineImage(src) || allowed) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary user content, not a site asset
    return <img src={src} alt={alt} referrerPolicy="no-referrer" />;
  }

  return (
    <span className="md-image-blocked">
      <ImageOff aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        {alt || "Image"} <span className="text-dim">(remote image not loaded)</span>
      </span>
      <button type="button" className="chip" onClick={() => setAllowed(true)}>
        Load image
      </button>
    </span>
  );
}

// Formats whose output is a drawing. A fenced code block whose language is one
// of their ids (```mermaid) is drawn instead of shown as code, as GitHub does.
const DIAGRAM_FORMATS = FORMATS.filter((f) => f.output === "diagram");

/** The diagram format and source of a <pre><code class="language-…"> block, or null for ordinary code. */
export function diagramIn(pre: Element | undefined): { format: RegisteredFormat; source: string } | null {
  const code = pre?.children[0];
  if (code?.type !== "element" || code.tagName !== "code") return null;
  const classes = code.properties.className;
  const language = Array.isArray(classes)
    ? classes.map(String).find((c) => c.startsWith("language-"))?.slice("language-".length)
    : undefined;
  const format = DIAGRAM_FORMATS.find((f) => f.id === language);
  if (!format) return null;
  const source = code.children.map((child) => (child.type === "text" ? child.value : "")).join("");
  return { format, source };
}

const components: Components = {
  pre: ({ node, ...props }) => {
    const diagram = diagramIn(node);
    if (diagram) return <EmbeddedDiagram format={diagram.format} source={diagram.source} />;
    return <pre {...props} />;
  },
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) => <PreviewImage src={typeof src === "string" ? src : ""} alt={alt ?? ""} />,
};

// The default drops data: URLs; allow them for images only (they are inline, not fetched).
const urlTransform: UrlTransform = (url, key) =>
  key === "src" && isInlineImage(url) ? url : defaultUrlTransform(url);

/** Renders Markdown for reading. Raw HTML in the Markdown is not rendered. */
export function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <article className="md-preview">
        <Markdown remarkPlugins={[remarkGfm]} skipHtml components={components} urlTransform={urlTransform}>
          {source}
        </Markdown>
      </article>
    </div>
  );
}
