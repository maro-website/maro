export interface PromptLink { href: string; label: string; favicon: string }

/** Text stays untouched; previews only accept public HTTP(S) link syntax. */
export function promptLinks(value: string): PromptLink[] {
  const links = new Map<string, PromptLink>();
  for (const match of value.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi)) {
    const text = match[0].replace(/[.,!?;:]+$/, "").replace(/\)+$/, suffix => {
      const opening = (match[0].match(/\(/g) ?? []).length;
      const closing = (match[0].match(/\)/g) ?? []).length;
      return suffix.slice(0, Math.max(0, suffix.length - Math.max(0, closing - opening)));
    });
    try {
      const url = new URL(/^www\./i.test(text) ? `https://${text}` : text);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) continue;
      links.set(url.href, { href: url.href, label: `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`, favicon: `${url.origin}/favicon.ico` });
    } catch { /* A partly typed link will be picked up on the next keystroke. */ }
  }
  return [...links.values()];
}
