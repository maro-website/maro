"use client";

import * as React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import {
  formatOrderAmount,
  formatOrderDate,
  ORDER_STATUS_LABELS,
  type OrderDisplayStatus,
} from "@/lib/payments/orderDisplay";
import { Download, Receipt, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface OrderRow {
  id: string;
  status: string;
  displayStatus: OrderDisplayStatus;
  cancelReason?: string | null;
  credits: number;
  amountCents: number;
  currency: string;
  label: string;
  itemId?: string | null;
  provider?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

const STATUS_TONE: Record<OrderDisplayStatus, "brand" | "neutral" | "success"> = {
  paid: "brand",
  pending: "neutral",
  cancelled: "neutral",
  failed: "neutral",
};

export function OrdersSection() {
  const { getAccessToken } = useMaro();
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<OrderRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken();
    const res = await fetch("/api/payments/orders", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setLoading(false);
    if (!res.ok) {
      toast("Porositë nuk u ngarkuan.");
      setOrders([]);
      return;
    }
    const data = (await res.json()) as { orders: OrderRow[] };
    setOrders(data.orders ?? []);
  }, [getAccessToken, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const downloadInvoice = async (orderId: string) => {
    setDownloading(orderId);
    const token = await getAccessToken();
    const res = await fetch(`/api/payments/invoice?orderId=${encodeURIComponent(orderId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setDownloading(null);
    if (!res.ok) {
      toast("Fatura nuk u shkarkua.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fatura-${orderId.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading && orders === null) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center text-[14px] text-ink-3">
        Duke ngarkuar porositë…
      </div>
    );
  }

  const list = orders ?? [];

  return (
    <div className="rounded-2xl bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-bold text-ink">Porositë e mia</div>
          <p className="mt-1 text-[13px] text-ink-2">
            Historiku i plotë — të paguara, në pritje, anuluar dhe të refuzuara.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-maro12 bg-surface-2 px-3 py-2 text-[13px] font-semibold text-ink-2 hover:bg-surface-hover hover:text-ink"
        >
          <RefreshCw className="h-4 w-4" /> Rifresko
        </button>
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-xl bg-surface-2 px-4 py-10 text-center">
          <Receipt className="mx-auto h-8 w-8 text-ink-3" />
          <p className="mt-3 text-[14px] text-ink-2">Ende s&apos;ke porosi.</p>
          <Button className="mt-4" variant="secondary" onClick={() => (window.location.href = "/pricing")}>
            Shiko planet
          </Button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="text-[11px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Porosia</th>
                <th className="pb-3 pr-4 font-semibold">Paketa</th>
                <th className="pb-3 pr-4 font-semibold">Shuma</th>
                <th className="pb-3 pr-4 font-semibold">Statusi</th>
                <th className="pb-3 pr-4 font-semibold">Data</th>
                <th className="pb-3 font-semibold">Faturë</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="py-3.5 pr-4">
                    <span className="font-mono text-[12px] text-ink-2">{o.id.slice(0, 8)}…</span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="font-semibold text-ink">{o.label}</div>
                    <div className="text-[12px] text-ink-3">
                      {o.credits.toLocaleString("de-DE")} kr
                      {o.provider ? ` · ${o.provider}` : ""}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-semibold text-ink">
                    {formatOrderAmount(o.amountCents, o.currency)}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={STATUS_TONE[o.displayStatus]} className="text-[11px]">
                      {ORDER_STATUS_LABELS[o.displayStatus]}
                    </Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-ink-3">
                    {formatOrderDate(o.paidAt ?? o.createdAt)}
                  </td>
                  <td className="py-3.5">
                    <button
                      type="button"
                      disabled={downloading === o.id}
                      onClick={() => void downloadInvoice(o.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                        o.displayStatus === "paid"
                          ? "text-brand hover:bg-brand/10"
                          : "text-ink-3 hover:bg-surface-2 hover:text-ink"
                      )}
                      title={
                        o.displayStatus === "paid"
                          ? "Shkarko faturën"
                          : "Shkarko konfirmimin e porosisë"
                      }
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloading === o.id ? "…" : "PDF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
