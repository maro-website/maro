"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { initializePaddle } from "@paddle/paddle-js";
import { useMaro } from "@/context/store";
import { AppShell } from "@/components/app/AppShell";
import { resolvePaddleEnvironment, validatePaddleClientToken } from "@/lib/payments/paddle/environment";

function PaddlePayment() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const { user, ready, getAccessToken } = useMaro();
  const userId = user?.id;
  const [status, setStatus] = useState("pending");
  useEffect(() => {
    setStatus("pending");
    if (!ready || !userId || !orderId) return;
    let stopped = false;
    let opened = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/payments/order?orderId=${encodeURIComponent(orderId!)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const { order } = await res.json();
        if (stopped) return;
        if (order.provider !== "paddle") throw new Error();
        setStatus(order.status);
        if (order.status !== "pending") return;
        if (!opened) {
          if (process.env.NEXT_PUBLIC_PADDLE_ENABLED !== "true") throw new Error();
          const environment = resolvePaddleEnvironment(process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT);
          const clientToken = validatePaddleClientToken(environment, process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
          const paddle = await initializePaddle({ environment, token: clientToken });
          if (!paddle || stopped) return;
          opened = true;
          paddle.Checkout.open({ transactionId: order.providerTransactionId,
            settings: { displayMode: "overlay", variant: "one-page", allowLogout: false, showAddDiscounts: false },
          });
        }
        if (++attempts < 150) timer = setTimeout(() => void poll(), 2000);
        else setStatus("waiting");
      } catch { if (!stopped) setStatus("error"); }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [ready, userId, orderId, getAccessToken]);
  const paid = status === "paid";
  return <AppShell showFooter><div className="mx-auto max-w-xl px-5 py-16 text-center">
    <h1 className="text-3xl font-bold">{paid ? "Pagesa u konfirmua" : "Pagesa me Paddle"}</h1>
    <p role="status" className="mt-4 text-ink-2">
      {!user && ready ? "Identifikohu për të vazhduar pagesën." : !orderId ? "Hap pagesën nga porosia jote në maro." :
        paid ? "Kreditet janë regjistruar në llogarinë tënde." :
        status === "error" ? "Pagesa nuk u ngarkua. Provo të rifreskosh faqen." :
        status === "failed" || status === "cancelled" ? "Pagesa nuk u përfundua." :
        "Pagesa dhe aktivizimi konfirmohen nga serveri. Mund ta kontrollosh porosinë në llogarinë tënde."}
    </p>
    <Link className="mt-6 inline-block font-semibold text-brand" href={user ? "/account?tab=billing" : `/sign-in?next=${encodeURIComponent(`/pay/paddle?order=${orderId ?? ""}`)}`}>
      {user ? "Llogaria dhe faturimi" : "Identifikohu"}
    </Link>
  </div></AppShell>;
}
export default function PaddlePaymentPage() { return <Suspense fallback={null}><PaddlePayment /></Suspense>; }
