"use client";
import { useState } from "react";
import { useMaro } from "@/context/store";
import { Button } from "@/components/ui/Button";

export function PaddlePortalButton() {
  const { getAccessToken } = useMaro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <div>
    <Button variant="secondary" loading={busy} onClick={async () => {
      setBusy(true); setError(false);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/payments/paddle/portal", {
          method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok || typeof data.url !== "string" || !data.url.startsWith("https://")) throw new Error();
        window.location.assign(data.url);
      } catch { setError(true); } finally { setBusy(false); }
    }}>Menaxho abonimin dhe faturat në Paddle</Button>
    {error && <p role="alert" className="mt-2 text-sm text-danger">Portali nuk u hap. Provo përsëri.</p>}
  </div>;
}
