"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMaro } from "@/context/store";
import { AppShell } from "@/components/app/AppShell";
import { raiAcceptPaymentMessage } from "@/lib/payments/raiaccept/presentation";
interface State {order:{id:string;label:string;amountCents:number;currency:string;credits:number;itemId:string|null};paymentState:string;fulfillmentState:string;requiresReview:boolean;redirectUrl?:string}
export function RaiAcceptReturn() {
  const params=useSearchParams();const orderId=params.get("orderId")??"";
  const {user,getAccessToken,refreshProfile}=useMaro();const [state,setState]=useState<State|null>(null);const [error,setError]=useState("");
  useEffect(()=>{
    const abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let attempts=0;
    void (async function check() {try {
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) {setError("Numri i porosisë nuk është i vlefshëm.");return;}
      const token=await getAccessToken();const headers={Authorization:`Bearer ${token}`};
      // Redirect result is ignored. Ask the server to verify through the bank API.
      await fetch("/api/payments/raiaccept/verify",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({orderId}),signal:abort.signal});
      const response=await fetch(`/api/payments/raiaccept/status?orderId=${encodeURIComponent(orderId)}`,{headers,cache:"no-store",signal:abort.signal});
      if (!response.ok) throw new Error("status_unavailable");const current:State=await response.json();
      if (abort.signal.aborted) return;setState(current);setError("");
      if (current.fulfillmentState==="fulfilled") await refreshProfile();
      if (["unpaid","fully_refunded"].includes(current.paymentState)||current.fulfillmentState==="fulfilled") {
        if (sessionStorage.getItem(`raiaccept:${user?.id}:${current.order.itemId}`)) sessionStorage.removeItem(`raiaccept:${user?.id}:${current.order.itemId}`);
      }
      if (current.paymentState!=="unverified"||current.requiresReview) return;
    } catch {if (!abort.signal.aborted) setError("Konfirmimi nuk u ngarkua ende. Kontrollo porositë te llogaria; mos paguaj përsëri.");}
    if (!abort.signal.aborted&&++attempts<10) timer=setTimeout(()=>void check(),30_000);
    })();
    return ()=>{abort.abort();if (timer) clearTimeout(timer);};
  },[orderId,getAccessToken,refreshProfile,user?.id]);
  const message=raiAcceptPaymentMessage(state?.paymentState??"unverified",state?.fulfillmentState??"pending",state?.requiresReview??false);
  async function invoice() {
    try {const token=await getAccessToken();const response=await fetch(`/api/payments/invoice?orderId=${encodeURIComponent(orderId)}`,{headers:{Authorization:`Bearer ${token}`}});
      if (!response.ok) throw new Error();const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download=`fatura-${orderId.slice(0,8)}.html`;link.click();URL.revokeObjectURL(url);
    } catch {setError("Fatura nuk u shkarkua. Provoje te porositë e llogarisë.");}
  }
  return <AppShell showFooter><section className="mx-auto max-w-xl px-6 py-16">
    <h1 className="text-3xl font-bold text-ink">{message.title}</h1><p className="mt-4 text-ink-2">{message.body}</p>
    <p className="mt-6 break-all text-sm text-ink-3">Porosia: {orderId}</p>
    {state&&<div className="mt-5 rounded-2xl bg-surface p-5"><p className="font-semibold text-ink">{state.order.label}</p><p className="mt-2 text-ink-2">{(state.order.amountCents/100).toFixed(2)} {state.order.currency} · {state.order.credits} kredite</p></div>}
    {state?.redirectUrl&&!state.requiresReview&&<a className="maro-button mt-6" data-variant="inverse" href={state.redirectUrl}>Vazhdo pagesën e kësaj porosie</a>}
    {state&&["paid","partially_refunded","fully_refunded"].includes(state.paymentState)&&<button className="maro-button mt-6" onClick={()=>void invoice()}>Shkarko faturën</button>}
    {error&&<p role="alert" className="mt-4 text-ink">{error}</p>}
    <Link href="/account?tab=orders" className="mt-6 block font-semibold underline">Porositë e mia</Link>
  </section></AppShell>;
}
