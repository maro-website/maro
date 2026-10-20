"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

const MASK = "*****";
const PrivacyContext = React.createContext({ hidden: false, ready: true, toggle: () => {} });

export function AdminPrivacyProvider({ account, children }: { account: string; children?: React.ReactNode }) {
  const storageKey = `maro:admin:privacy:${account.trim().toLowerCase()}`;
  // Mask until the saved preference is read, including during server rendering.
  const [preference, setPreference] = React.useState<{ key: string; hidden: boolean } | null>(null);
  const ready = preference?.key === storageKey;
  const hidden = !ready || preference.hidden;

  React.useEffect(() => {
    const read = () => {
      let hidden = true;
      try { hidden = window.localStorage.getItem(storageKey) !== "visible"; } catch { /* Keep private when storage is unavailable. */ }
      setPreference({ key: storageKey, hidden });
    };
    read();
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);

  const toggle = () => {
    if (!ready) return;
    const next = !hidden;
    setPreference({ key: storageKey, hidden: next });
    try { window.localStorage.setItem(storageKey, next ? "hidden" : "visible"); } catch { /* The toggle still works for this visit. */ }
  };

  return <PrivacyContext.Provider value={{ hidden, ready, toggle }}>{children}</PrivacyContext.Provider>;
}

export function useAdminPrivacy() { return React.useContext(PrivacyContext); }

/** Replace the value itself so titles, copy/paste and assistive technology cannot reveal it. */
export function AdminPrivateValue({ children, plain = false }: { children?: React.ReactNode; plain?: boolean }) {
  const { hidden } = useAdminPrivacy();
  if (!hidden) return <>{children}</>;
  return plain ? MASK : <span aria-label="Vlerë e fshehur">{MASK}</span>;
}

export function AdminPrivacyToggle() {
  const { hidden, ready, toggle } = useAdminPrivacy();
  const label = hidden ? "Shfaq vlerat private" : "Fshih vlerat private";
  return <Button variant="ghost" size="icon" disabled={!ready} aria-label={label} title={label} aria-pressed={hidden} onClick={toggle}>
    {hidden ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
  </Button>;
}
