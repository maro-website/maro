// Parsers for the delimiter-based HTML responses (generation + edit).
// Client-safe: no server-only imports.

import type { AiHtmlPage } from "./types";

// Strip accidental ```html fences if the model wrapped a document.
function stripFences(s: string): string {
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : s).trim();
}

export function parseHtmlPages(text: string): AiHtmlPage[] {
  const pages: AiHtmlPage[] = [];
  const re =
    /===PAGE===\s*SLUG:\s*(.+?)\r?\n\s*NAME:\s*(.+?)\r?\n\s*---HTML---\s*([\s\S]*?)\s*===END===/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const slug = m[1].trim();
    const name = m[2].trim();
    const html = stripFences(m[3]);
    if (html.toLowerCase().includes("<html") || html.toLowerCase().includes("<!doctype")) {
      pages.push({ slug, name, html });
    }
  }

  // Fallback: the model returned a single raw document without the wrapper.
  if (pages.length === 0) {
    const cleaned = stripFences(text);
    if (cleaned.toLowerCase().includes("<!doctype") || cleaned.toLowerCase().includes("<html")) {
      pages.push({ slug: "home", name: "Home", html: cleaned });
    }
  }

  return pages;
}

export interface ParsedHtmlEdit {
  reply: string;
  versionLabel: string;
  cost: number;
  html: string;
}

export function parseHtmlEdit(text: string): ParsedHtmlEdit | null {
  const grab = (re: RegExp) => {
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };
  const reply = grab(/===REPLY===\s*([\s\S]*?)\s*===LABEL===/);
  const label = grab(/===LABEL===\s*([\s\S]*?)\s*===COST===/);
  const costStr = grab(/===COST===\s*([\s\S]*?)\s*---HTML---/);
  let html = grab(/---HTML---\s*([\s\S]*?)\s*===END===/);

  if (!html) {
    // Fallback: maybe only a raw document came back.
    const cleaned = stripFences(text);
    if (cleaned.toLowerCase().includes("<!doctype") || cleaned.toLowerCase().includes("<html")) {
      html = cleaned;
    }
  }
  html = stripFences(html);
  if (!html || !(html.toLowerCase().includes("<html") || html.toLowerCase().includes("<!doctype"))) {
    return null;
  }

  const cost = Math.max(0, Math.min(20, parseInt(costStr, 10) || 5));
  return {
    reply: reply || "Ndryshimet u aplikuan.",
    versionLabel: label || "Ndryshim me AI",
    cost,
    html,
  };
}
