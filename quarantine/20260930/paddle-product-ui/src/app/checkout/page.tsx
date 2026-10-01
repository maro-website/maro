"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useMaro } from "@/context/store";
import { formatEur } from "@/lib/credits/money";
import { formatCredits } from "@/lib/credits/format";
import { checkoutProvider, checkoutEntryUrl, checkoutDestination } from "@/lib/payments/checkout-routing";
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
  const [preview, setPreview] = React.useState<{
    label: string;
    credits: number;
    priceEur: number;
    orderKind: string;
  } | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [country, setCountry] = React.useState("Kosovë");
  const [city, setCity] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [nui, setNui] = React.useState("");
  const [legalAccepted, setLegalAccepted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [promoCode, setPromoCode] = React.useState("");
  // The URL is authoritative so refresh, sign-in and back navigation cannot
  // silently turn a Paddle checkout into a legacy payment.
  const provider = checkoutProvider(searchParams.get("provider"));
  const paddleAvailable = process.env.NEXT_PUBLIC_PADDLE_ENABLED === "true" &&
    ["standard", "pro", "topup-100", "topup-200", "topup-500", "topup-1000"].includes(itemId);
  const checkoutUrl = provider ? checkoutEntryUrl(itemId, provider, promoFromUrl) : "/checkout?provider=invalid";

  React.useEffect(() => {
    if (promoFromUrl) setPromoCode(promoFromUrl);
  }, [promoFromUrl]);

  React.useEffect(() => {
    if (!ready || !user || !itemId) return;
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/commerce/checkout-preview?item=${encodeURIComponent(itemId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as {
        label?: string;
        credits?: number;
        priceEur?: number;
        orderKind?: string;
        error?: string;
      };
      if (cancelled) return;
      if (!res.ok) {
        setPreview(null);
        setPreviewError(data.error ?? "invalid_item");
        return;
      }
      setPreviewError(null);
      setPreview({
        label: data.label ?? itemId,
        credits: data.credits ?? 0,
        priceEur: data.priceEur ?? 0,
        orderKind: data.orderKind ?? "plan_purchase",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, itemId, getAccessToken]);

  React.useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/sign-in?next=${encodeURIComponent(checkoutUrl)}`);
      return;
    }
    setFullName(user.name || "");
    setEmail(user.email || "");
  }, [ready, user, router, checkoutUrl]);

  if (!provider || !paddleAvailable) {
    return <AppShell showFooter><div className="mx-auto max-w-lg px-5 py-20 text-center">
      <h1 className="text-2xl font-bold">Pagesa me Paddle nuk është e disponueshme</h1>
      <p role="alert" className="mt-4 text-ink-2">Kjo pagesë nuk mund të vazhdojë. Rifresko pasi Paddle të jetë aktivizuar.</p>
    </div></AppShell>;
  }

  if (!preview && previewError) {
    const messages: Record<string, string> = {
      topup_requires_active_plan: "Top-up kërkon plan aktiv.",
      plan_already_active: "Ke tashmë plan aktiv. Menaxho abonimin nga faqja e faturimit në llogarinë tënde.",
      paddle_subscription_managed: "Menaxho abonimin në portalin Paddle nga faqja e faturimit në llogarinë tënde.",
      renewal_not_available: "Rinovimi nuk është ende i disponueshëm.",
      upgrade_not_eligible: "Upgrade në maroPro nuk është i disponueshëm për llogarinë tënde.",
    };
    return (
      <AppShell showFooter>
        <div className="mx-auto max-w-lg px-5 py-20 text-center">
          <p className="text-[15px] text-ink-2">
            {messages[previewError] ?? "Artikulli i zgjedhur nuk është i vlefshëm."}
          </p>
          <Link href="/pricing" className="mt-4 inline-block text-[14px] font-semibold text-brand hover:underline">
            Kthehu te planet
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!preview) {
    return (
      <AppShell showFooter>
        <div className="mx-auto max-w-lg px-5 py-20 text-center text-[15px] text-ink-3">
          Duke ngarkuar…
        </div>
      </AppShell>
    );
  }

  const item = preview;

  const pay = async () => {
    setError(null);
    if (!fullName.trim() || !city.trim() || !legalAccepted) {
      setError(!legalAccepted ? LEGAL_CONSENT_REQUIRED : "Plotëso fushat e detyrueshme.");
      return;
    }
    setLoading(true);
    try {
    const destination = checkoutDestination(provider, paddleAvailable);
    const token = await getAccessToken();
    const res = await fetch(destination.endpoint, {
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
    const data = (await res.json()) as { orderId?: string; transactionId?: string; error?: string };
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
    if (!data.orderId || !/^txn_[a-z0-9]{26}$/.test(data.transactionId ?? "")) {
      throw new Error("invalid_checkout_response");
    }
    router.push(`${destination.paymentPath}?order=${encodeURIComponent(data.orderId)}`);
    } catch {
      setError("Porosia nuk u krijua. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  const sandbox = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox";
  const payButtonLabel = `Vazhdo me Paddle${sandbox ? " (Sandbox)" : ""} · ${formatEur(item.priceEur)}`;

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-xl px-5 py-12 sm:px-8">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Kthehu
        </Link>

        <h1 className="mt-6 text-[clamp(26px,5vw,36px)] font-bold tracking-brand text-ink">
          Checkout
        </h1>

        <div className="mt-6 rounded-maro16 bg-surface p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Porosia</p>
          <p className="mt-2 text-[18px] font-semibold text-ink">{item.label}</p>
          <p className="mt-1 text-[14px] text-ink-2">
            {formatCredits(item.credits)} kredite · {formatEur(item.priceEur)}
          </p>
        </div>

        <div className="mt-6 rounded-maro12 bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
          {item.orderKind === "plan_purchase"
            ? `Paddle: ${formatEur(item.priceEur)} çdo 30 ditë, me rinovim automatik. Anulo në portalin e faturimit.`
            : "Paddle: blerje njëherëshe kreditesh."}
          {sandbox && " Sandbox: nuk kryhet pagesë reale."}
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

          {promoCode && <p className="text-sm text-danger">Ky promo kod nuk mbështetet nga Paddle. <button type="button" className="underline" onClick={() => { setPromoCode(""); router.replace(checkoutEntryUrl(itemId)); }}>Hiqe kodin</button></p>}

          {error && (
            <div className="flex items-start gap-2 rounded-maro12 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <LegalConsentCheckbox
            id="checkout-legal"
            checked={legalAccepted}
            onChange={setLegalAccepted}
          />

          <Button type="submit" className="mt-2 w-full" loading={loading} disabled={!legalAccepted || !!promoCode}>
            {payButtonLabel}
          </Button>

          <button
            type="button"
            onClick={() => router.push("/account?tab=billing")}
            className="text-center text-[13px] font-semibold text-ink-3 hover:text-ink"
          >
            Anulo porosinë
          </button>
        </form>
      </div>
    </AppShell>
  );
}
