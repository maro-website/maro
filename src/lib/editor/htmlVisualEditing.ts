export type HtmlElementKind = "text" | "link" | "image" | "field";

export interface HtmlElementSelection {
  pageId: string;
  path: number[];
  tagName: string;
  kind: HtmlElementKind;
  text: string;
  href?: string;
  src?: string;
  alt?: string;
  placeholder?: string;
  value?: string;
}

export interface HtmlElementPatch {
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  placeholder?: string;
  value?: string;
}

export interface HtmlEditorBridgeSelection extends Omit<HtmlElementSelection, "pageId"> {}

export interface HtmlEditorBridgeMessage {
  source: "maro-preview-editor";
  channel: string;
  type: "select";
  selection: HtmlEditorBridgeSelection;
}

const MAX_PATH_DEPTH = 64;
const MAX_FIELD_LENGTH = 100_000;

function boundedString(value: unknown, max = MAX_FIELD_LENGTH): value is string {
  return typeof value === "string" && value.length <= max;
}

export function isHtmlEditorBridgeMessage(
  value: unknown,
  channel: string
): value is HtmlEditorBridgeMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (
    message.source !== "maro-preview-editor" ||
    message.channel !== channel ||
    message.type !== "select" ||
    !message.selection ||
    typeof message.selection !== "object"
  ) {
    return false;
  }

  const selection = message.selection as Record<string, unknown>;
  if (
    !Array.isArray(selection.path) ||
    selection.path.length > MAX_PATH_DEPTH ||
    !selection.path.every((part) => Number.isInteger(part) && part >= 0 && part <= 100_000) ||
    !boundedString(selection.tagName, 32) ||
    !["text", "link", "image", "field"].includes(String(selection.kind)) ||
    !boundedString(selection.text)
  ) {
    return false;
  }

  return ["href", "src", "alt", "placeholder", "value"].every(
    (key) => selection[key] === undefined || boundedString(selection[key])
  );
}

function resolveElement(document: Document, path: number[]): Element | null {
  let current: Element = document.documentElement;
  for (const index of path) {
    const child = current.children.item(index);
    if (!child) return null;
    current = child;
  }
  return current;
}

function findEditableTextNode(node: Node): Text | null {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.nodeValue?.trim()) return child as Text;
  }
  for (const child of Array.from(node.childNodes)) {
    const nested = findEditableTextNode(child);
    if (nested) return nested;
  }
  return null;
}

function replaceTextPreservingWhitespace(element: Element, text: string): void {
  const textNode = findEditableTextNode(element);
  if (!textNode) {
    element.textContent = text;
    return;
  }

  const current = textNode.nodeValue ?? "";
  const leading = current.match(/^\s*/)?.[0] ?? "";
  const trailing = current.match(/\s*$/)?.[0] ?? "";
  textNode.nodeValue = `${leading}${text}${trailing}`;
}

export function editHtmlElement(
  html: string,
  path: number[],
  expectedTagName: string,
  patch: HtmlElementPatch
): string {
  if (typeof DOMParser === "undefined" || path.length > MAX_PATH_DEPTH) return html;

  const document = new DOMParser().parseFromString(html, "text/html");
  const element = resolveElement(document, path);
  if (!element || element.tagName.toLowerCase() !== expectedTagName.toLowerCase()) return html;

  if (patch.text !== undefined) replaceTextPreservingWhitespace(element, patch.text);
  if (patch.href !== undefined) {
    if (patch.href.trim()) element.setAttribute("href", patch.href.trim());
    else element.removeAttribute("href");
  }
  if (patch.src !== undefined) {
    if (patch.src.trim()) element.setAttribute("src", patch.src.trim());
    else element.removeAttribute("src");
  }
  if (patch.alt !== undefined) element.setAttribute("alt", patch.alt);
  if (patch.placeholder !== undefined) element.setAttribute("placeholder", patch.placeholder);
  if (patch.value !== undefined) {
    if (element.tagName.toLowerCase() === "textarea") element.textContent = patch.value;
    else element.setAttribute("value", patch.value);
  }

  const doctype = /<!doctype\s+html/i.test(html) ? "<!DOCTYPE html>\n" : "";
  return `${doctype}${document.documentElement.outerHTML}`;
}
