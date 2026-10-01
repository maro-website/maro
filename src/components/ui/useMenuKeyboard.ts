"use client";

import * as React from "react";

/** Arrow navigation, Escape dismissal and trigger focus for existing menus. */
export function useMenuKeyboard(open: boolean, panelRef: React.RefObject<HTMLElement | null>, triggerRef: React.RefObject<HTMLElement | null>, close: () => void) {
  const closeRef = React.useRef(close);
  closeRef.current = close;
  React.useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), [role="menuitem"][tabindex]'))
      .filter(el => el.getClientRects().length > 0 && el.getAttribute("aria-disabled") !== "true");
    items()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape" && (panel.contains(document.activeElement) || triggerRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        closeRef.current();
        const trigger = triggerRef.current;
        if (trigger?.matches('button, a, [tabindex]')) trigger.focus();
        else trigger?.querySelector<HTMLElement>('button, a, [tabindex]')?.focus();
        return;
      }
      if (!panel.contains(document.activeElement)) return;
      if (event.key === "Tab") {
        closeRef.current();
        const trigger = triggerRef.current;
        if (trigger?.matches('button, a, [tabindex]')) trigger.focus();
        else trigger?.querySelector<HTMLElement>('button, a, [tabindex]')?.focus();
        return;
      }
      if (["Home", "End"].includes(event.key) && document.activeElement?.matches("input, textarea")) return;
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const controls = items();
      if (!controls.length) return;
      event.preventDefault();
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 :
        (index + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length;
      controls[next]?.focus();
    };
    // Menus consume Escape before a containing dialog processes dismissal.
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // Selecting an item removes its DOM node; retain the user's keyboard position.
      if (document.activeElement === document.body || panel.contains(document.activeElement)) {
        const trigger = triggerRef.current;
        if (trigger?.matches('button, a, [tabindex]')) trigger.focus();
        else trigger?.querySelector<HTMLElement>('button, a, [tabindex]')?.focus();
      }
    };
  }, [open, panelRef, triggerRef]);
}
