"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useMaro } from "@/context/store";
import { getCheckoutItem, formatEur } from "@/lib/credits/money";
import {
  LegalConsentCheckbox,
  LEGAL_CONSENT_REQUIRED,
} from "@/components/legal/LegalConsentCheckbox";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={null}>
      <CheckoutPageInner />
    </React.Suspense>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready, getAccessToken } = useMaro();

  const itemId = searchParams.get("item") ?? "";
  const promoFromUrl = searchParams.get("promo")?.trim() ?? "";
  const item = getCheckoutItem(itemId);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [country, setCountry] = React.useState("Kosovë");
  const [city, setCity] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [nui, setNui] = React.useState("");
  const [legalAccepted, setLegalAccepted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [promoCode, setPromoCode] = React.useState("");

  React.useEffect(() => {
    if (promoFromUrl) setPromoCode(promoFromUrl);
  }, [promoFromUrl]);

  React.useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/sign-in?next=${encodeURIComponent(`/checkout?item=${itemId}`)}`);
      return;
    }
    setFullName(user.name || "");
    setEmail(user.email || "");
  }, [ready, user, router, itemId]);

  if (!item) {
    return (
      <AppShell showFooter>
        <div className="mx-auto max-w-lg px-5 py-20 text-center">
          <p className="text-[15px] text-ink-2">Artikulli i zgjedhur nuk është i vlefshëm.</p>
          <Link href="/pricing" className="mt-4 inline-block text-[14px] font-semibold text-brand hover:underline">
            Kthehu te planet
          </Link>
        </div>
      </AppShell>
    );
  }

  const pay = async () => {
    setError(null);
    if (!fullName.trim() || !city.trim() || !legalAccepted) {
      setError(!legalAccepted ? LEGAL_CONSENT_REQUIRED : "Plotëso fushat e detyrueshme.");
      return;
    }
    setLoading(true);
    const token = await getAccessToken();
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        itemId,
        promoCode: promoCode.trim() || undefined,
        fullName: fullName.trim(),
        email: email.trim(),
        country: country.trim(),
        city: city.trim(),
        businessName: businessName.trim() || undefined,
        nui: nui.trim() || undefined,
        legalConsent: true,
      }),
    });
    const data = (await res.json()) as { orderId?: string; error?: string };
    setLoading(false);
    if (!res.ok) {
      if (data.error === "topup_requires_plan") {
        setError("Top-up kërkon plan aktiv. Bli një plan fillimisht.");
      } else if (data.error === "invalid_promo") {
        setError("Promo kodi nuk është i vlefshëm.");
      } else {
        setError("Porosia nuk u krijua. Provo përsëri.");
      }
      return;
    }
    setOrderId(data.orderId ?? null);
    router.push(`/pay/redirect?order=${data.orderId}`);
  };

  const cancelOrder = async () => {
    if (orderId) {
      const token = await getAccessToken();
      await fetch("/api/payments/cancel-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId }),
      });
    }
    router.push(orderId ? `/order/cancel?order=${orderId}` : "/pricing");
  };

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-xl px-5 py-12 sm:px-8">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Kthehu
        </Link>

        <h1 className="mt-6 text-[clamp(26px,5vw,36px)] font-light tracking-[-0.03em] text-ink">
          Checkout
        </h1>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Porosia</p>
          <p className="mt-2 text-[18px] font-semibold text-ink">{item.label}</p>
          <p className="mt-1 text-[14px] text-ink-2">
            {item.credits.toLocaleString("de-DE")} kredite · {formatEur(item.priceEur)}
          </p>
        </div>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void pay();
          }}
        >
          <Field label="Emri i plotë *">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} readOnly className="opacity-70" />
          </Field>
          <Field label="Shteti *">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} required />
          </Field>
          <Field label="Komuna / Qyteti *">
            <Input value={city} onChange={(e) => setCity(e.target.value)} required />
          </Field>
          <Field label="Emri i biznesit (opsional)">
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </Field>
          <Field label="NUI (opsional)">
            <Input value={nui} onChange={(e) => setNui(e.target.value)} />
          </Field>

          <Field label="Promo kod (opsional)">
            <Input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Kodi i zbritjes / kreatorit"
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <LegalConsentCheckbox
            id="checkout-legal"
            checked={legalAccepted}
            onChange={setLegalAccepted}
          />

          <Button type="submit" className="mt-2 w-full" loading={loading} disabled={!legalAccepted}>
            Paguaj me Raiffeisen · {formatEur(item.priceEur)}
          </Button>

          <button
            type="button"
            onClick={() => void cancelOrder()}
            className="text-center text-[13px] font-semibold text-ink-3 hover:text-ink"
          >
            Anulo porosinë
          </button>
        </form>
      </div>
    </AppShell>
  );
}
