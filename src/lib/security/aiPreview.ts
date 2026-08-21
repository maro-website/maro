/**
 * Client-safe helpers for sandboxed AI HTML previews.
 * AI-generated website HTML is untrusted and must not share origin with Maro.
 */

/** Minimal sandbox: scripts only. No same-origin, popups, forms, or top navigation. */
export const AI_HTML_PREVIEW_SANDBOX = "allow-scripts";

const PREVIEW_CSP =
  "default-src 'none'; script-src 'unsafe-inline' https://cdn.tailwindcss.com; " +
  "style-src 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com; img-src https: data: blob:; " +
  "connect-src https:; media-src https: data: blob:; frame-src 'none'; object-src 'none'; base-uri 'none';";

export interface AiPreviewEditorOptions {
  channel: string;
  selectedPath?: number[];
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function editorBridge(options: AiPreviewEditorOptions): string {
  const selector = [
    "img",
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    "label",
    "li",
    "blockquote",
    "figcaption",
    "strong",
    "em",
    "small",
    "[data-maro-editable]",
  ].join(",");

  return `<style data-maro-editor-bridge>
[data-maro-editor-hover]{outline:2px dashed #253FDA!important;outline-offset:3px!important;cursor:pointer!important}
[data-maro-editor-selected]{outline:3px solid #253FDA!important;outline-offset:3px!important}
</style><script data-maro-editor-bridge>(function(){
var channel=${safeJson(options.channel)};
var selectedPath=${safeJson(options.selectedPath ?? null)};
var selector=${safeJson(selector)};
function pathFor(element){
  var path=[];var current=element;var root=document.documentElement;
  while(current&&current!==root){var parent=current.parentElement;if(!parent)return null;path.unshift(Array.prototype.indexOf.call(parent.children,current));current=parent;}
  return current===root?path:null;
}
function resolvePath(path){var current=document.documentElement;if(!Array.isArray(path))return null;for(var i=0;i<path.length;i++){current=current.children.item(path[i]);if(!current)return null;}return current;}
function clearSelected(){document.querySelectorAll('[data-maro-editor-selected]').forEach(function(node){node.removeAttribute('data-maro-editor-selected');});}
function select(element){
  var path=pathFor(element);if(!path)return;clearSelected();element.setAttribute('data-maro-editor-selected','');
  var tag=element.tagName.toLowerCase();var kind=tag==='img'?'image':tag==='a'?'link':(['input','textarea','select'].indexOf(tag)>=0?'field':'text');
  var text=(kind==='field'?(element.value||''):(element.innerText||element.textContent||'')).trim().slice(0,100000);
  window.parent.postMessage({source:'maro-preview-editor',channel:channel,type:'select',selection:{
    path:path,tagName:tag,kind:kind,text:text,
    href:element.getAttribute('href')||undefined,src:element.getAttribute('src')||undefined,
    alt:element.getAttribute('alt')||undefined,placeholder:element.getAttribute('placeholder')||undefined,
    value:kind==='field'?(element.value||element.getAttribute('value')||''):undefined
  }},'*');
}
window.addEventListener('mouseover',function(event){var raw=event.target;if(!(raw instanceof Element))return;var target=raw.closest(selector);if(target)target.setAttribute('data-maro-editor-hover','');},true);
window.addEventListener('mouseout',function(event){var raw=event.target;if(!(raw instanceof Element))return;var target=raw.closest(selector);if(target)target.removeAttribute('data-maro-editor-hover');},true);
window.addEventListener('click',function(event){var raw=event.target;if(!(raw instanceof Element))return;var target=raw.closest(selector);if(!target)return;event.preventDefault();event.stopImmediatePropagation();select(target);},true);
var initial=resolvePath(selectedPath);if(initial)initial.setAttribute('data-maro-editor-selected','');
})();</script>`;
}

function injectEditorBridge(html: string, options?: AiPreviewEditorOptions): string {
  if (!options) return html;
  const bridge = editorBridge(options);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${bridge}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${bridge}</html>`);
  return `${html}${bridge}`;
}

/**
 * Wrap untrusted AI HTML in an isolated document with its own restrictive CSP.
 * The parent iframe uses sandbox without allow-same-origin (opaque origin).
 */
export function wrapAiPreviewDocument(html: string, editor?: AiPreviewEditorOptions): string {
  const trimmed = html.trim();
  const hasDoc = /<html[\s>]/i.test(trimmed);
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;

  if (hasDoc) {
    if (/<head[\s>]/i.test(trimmed)) {
      return injectEditorBridge(
        trimmed.replace(/<head(\s[^>]*)?>/i, (m) => `${m}${cspMeta}`),
        editor
      );
    }
    if (/<html(\s[^>]*)?>/i.test(trimmed)) {
      return injectEditorBridge(
        trimmed.replace(/<html(\s[^>]*)?>/i, (m) => `${m}<head>${cspMeta}</head>`),
        editor
      );
    }
  }

  return injectEditorBridge(
    `<!DOCTYPE html><html><head>${cspMeta}<meta charset="utf-8"></head><body>${trimmed}</body></html>`,
    editor
  );
}
