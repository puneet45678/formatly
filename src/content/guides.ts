import type { FormatId } from "@/formats/types";

// What each format page says about itself: the page title and description,
// the visible guide under the tool, the structured data, and llms.txt all
// come from here, so they never disagree.
//
// Write only what the tool really does. Search engines and chatbots repeat
// this text to people, so a claim that isn't true here becomes a wrong answer.
//
// A Record over every FormatId: adding a format without a guide doesn't compile.

export interface FormatGuide {
  /** The page title, before " · formatly". Leads with the words people search for. */
  title: string;
  /** Meta description: one or two sentences, under 160 characters. */
  description: string;
  /** Other names people search for this tool by. */
  aliases: readonly string[];
  /** The page's main heading. */
  heading: string;
  /** One paragraph under the heading. */
  intro: string;
  /** What the tool does, one short line each. */
  features: readonly string[];
  faq: readonly { question: string; answer: string }[];
}

const PRIVACY_FAQ = {
  question: "Is my data sent to a server?",
  answer:
    "No. Formatting runs in your browser, and the page's Content Security Policy blocks it from sending requests to any other site. What you paste isn't stored either: it's gone when you close the tab.",
} as const;

export const GUIDES: Record<FormatId, FormatGuide> = {
  json: {
    title: "JSON Formatter & Validator",
    description:
      "Format, beautify and validate JSON in your browser. Errors show the exact line and column. Numbers stay exactly as written. Nothing is uploaded.",
    aliases: ["JSON beautifier", "JSON validator", "JSON pretty print", "JSON viewer", "JSON lint"],
    heading: "JSON formatter and validator",
    intro:
      "Paste JSON to indent it and check that it's valid. If it isn't, you get a plain-English message and the line and column of the problem, and the line is marked in the editor.",
    features: [
      "Strict JSON: comments, trailing commas, single quotes and unquoted keys are reported, with a clear message for each",
      "Errors give the line and column, and the line is highlighted",
      "Numbers are kept exactly as written: long integers and values like 1e400 are not rounded",
      "Indent with 2 spaces, 4 spaces or tabs",
      "Large documents format in a background thread, so typing never freezes",
      "Copy the result or download it as a .json file",
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: "Why does my JSON with comments show an error?",
        answer:
          "Standard JSON doesn't allow comments or trailing commas, so this formatter reports them instead of silently accepting input that other programs would reject.",
      },
      {
        question: "Will formatting change my numbers?",
        answer:
          "No. Only whitespace changes. Large integers and numbers like 1e400 keep their exact digits, unlike tools that parse the JSON and print it again.",
      },
    ],
  },
  yaml: {
    title: "YAML Formatter & Validator",
    description:
      "Format and validate YAML in your browser. Keeps comments, quote styles and multiple documents. Errors show the line and column. Nothing is uploaded.",
    aliases: ["YAML beautifier", "YAML validator", "YAML lint", "YAML pretty print"],
    heading: "YAML formatter and validator",
    intro:
      "Paste YAML to re-indent it consistently and check that it parses. Comments, quote styles and document separators are kept, so the output still reads like your file.",
    features: [
      "Keeps comments, quote styles and --- document separators",
      "Formats files with several documents",
      "Errors give the line and column, and the line is highlighted",
      "Indent with 2 or 4 spaces (YAML doesn't allow tabs for indentation)",
      "Long lines are left as they are, not re-wrapped",
      "Copy the result or download it as a .yaml file",
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: "Does it remove my comments?",
        answer: "No. Comments are kept in place, along with your choice of single, double or no quotes.",
      },
      {
        question: "Why can't I indent YAML with tabs?",
        answer: "The YAML specification forbids tabs for indentation, so offering them would produce files other tools reject.",
      },
    ],
  },
  mermaid: {
    title: "Mermaid Diagram Viewer & Editor",
    description:
      "Preview Mermaid diagrams as you type: flowcharts, sequence diagrams and more. Zoom, pan, and download SVG or PNG. Runs in your browser.",
    aliases: ["Mermaid live editor", "Mermaid viewer", "Mermaid diagram preview", "Mermaid to SVG", "Mermaid to PNG"],
    heading: "Mermaid diagram viewer",
    intro:
      "Type or paste Mermaid and the diagram is drawn as you go. Syntax errors point at the line, and the finished diagram can be zoomed, panned and downloaded.",
    features: [
      "Live preview of flowcharts, sequence diagrams and the other Mermaid diagram types",
      "Syntax errors give the line, and the line is highlighted",
      "Zoom with the mouse wheel or buttons, drag to pan, fit to view",
      "Download the diagram as SVG or PNG",
      "Diagrams are drawn in Mermaid's strict security mode and sanitized before display",
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: "How big can a diagram be?",
        answer:
          "Up to 50,000 characters and 500 connections, Mermaid's own limits. Larger diagrams get a clear message instead of a broken drawing.",
      },
      {
        question: "Can I use the diagram elsewhere?",
        answer: "Yes. Download it as an SVG to edit or embed, or as a PNG image.",
      },
    ],
  },
  xml: {
    title: "XML Formatter & Validator",
    description:
      "Format, beautify and validate XML in your browser. Errors show the line and column. Keeps comments, CDATA and mixed content. Nothing is uploaded.",
    aliases: ["XML beautifier", "XML validator", "XML pretty print", "XML viewer"],
    heading: "XML formatter and validator",
    intro:
      "Paste XML to indent it and check that it's well-formed. A missing or mismatched tag is reported with its line and column instead of being formatted into something misleading.",
    features: [
      "Checks that the XML is well-formed before formatting it",
      "Errors give the line and column, and the line is highlighted",
      "Keeps comments, CDATA sections and text mixed with tags, such as <p>Hello <b>world</b></p>",
      "Indent with 2 spaces, 4 spaces or tabs",
      "Large files format in a background thread, so typing never freezes",
      "Copy the result or download it as a .xml file",
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: "Does it check against a schema (XSD)?",
        answer: "No. It checks that the XML is well-formed: tags match, attributes are quoted and the document has one root element.",
      },
      {
        question: "Will it change my text content?",
        answer: "No. Elements that contain text keep it on one line, so mixed content and whitespace inside text are left alone.",
      },
    ],
  },
  sql: {
    title: "SQL Formatter",
    description:
      "Format SQL queries in your browser for Standard SQL, SQL Server, PostgreSQL and MySQL. Uppercase keywords, clear errors, nothing uploaded.",
    aliases: ["SQL beautifier", "SQL pretty print", "T-SQL formatter", "PostgreSQL formatter", "MySQL formatter"],
    heading: "SQL formatter",
    intro:
      "Paste a query to lay it out one clause per line with uppercase keywords. Pick your database's dialect so its own syntax is understood.",
    features: [
      "Dialects: Standard SQL, SQL Server (T-SQL), PostgreSQL and MySQL",
      "Keywords in uppercase, one clause per line",
      "Errors give the line and column, and suggest a dialect when standard SQL can't read the query",
      "Indent with 2 spaces, 4 spaces or tabs",
      "Copy the result or download it as a .sql file",
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: "My query shows an error but it runs fine. Why?",
        answer:
          "It probably uses syntax specific to one database. Choose SQL Server, PostgreSQL or MySQL in the dialect menu so that syntax is recognised.",
      },
      {
        question: "Does it run my query?",
        answer: "No. It only changes the layout of the text. Nothing connects to a database.",
      },
    ],
  },
  markdown: {
    title: "Markdown Formatter & Preview",
    description:
      "Format Markdown consistently with Prettier and preview it, including tables and task lists. Runs in your browser; nothing is uploaded.",
    aliases: ["Markdown beautifier", "Markdown preview", "Markdown viewer", "Prettier Markdown"],
    heading: "Markdown formatter and preview",
    intro:
      "Paste Markdown to tidy it the way Prettier does, then read it rendered. Switch between the preview and the formatted source at any time.",
    features: [
      "Formatting by Prettier, the formatter most projects use",
      "Rendered preview with GitHub-style tables, task lists and strikethrough",
      "Raw HTML in the Markdown isn't rendered, and remote images load only when you click",
      "Copy the formatted source or download it as a .md file",
    ],
    faq: [
      PRIVACY_FAQ,
      {
        question: "Why didn't a remote image show in the preview?",
        answer:
          "Loading an image from another site tells that site someone opened your document, so remote images wait for a click. Images embedded as data: URLs show straight away.",
      },
      {
        question: "What does formatting change?",
        answer:
          "Spacing and style only, the way Prettier does: for example, list markers become -, and blank lines and indentation become consistent. The text itself is unchanged.",
      },
    ],
  },
};
