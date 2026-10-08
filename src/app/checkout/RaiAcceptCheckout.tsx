"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { useMaro } from "@/context/store";
import { AppShell } from "@/components/app/AppShell";

interface Preview {id:string;label:string;amountCents:number;currency:string;credits:number;orderKind:string;durationDays:number|null}
const ERROR_MESSAGES:Record<string,string>={plan_already_active:"Ke tashmë një plan aktiv.",topup_requires_active_plan:"Top-up kërkon plan aktiv.",
  renewal_not_available:"Rinovimi nuk është ende i disponueshëm.",upgrade_not_eligible:"Ky përmirësim plani nuk është i disponueshëm.",
  membership_checkout_pending:"Ke një pagesë plani në pritje. Kontrolloje te porositë.",purchases_unavailable:"Blerjet nuk janë ende të disponueshme për këtë llogari.",
  idempotency_conflict:"Kjo kërkesë është nisur me të dhëna të tjera. Kontrolloje porosinë te llogaria.",invalid_item:"Produkti nuk është i disponueshëm."};
export function RaiAcceptCheckout() {
  const params=useSearchParams();const router=useRouter();const {user,profile,getAccessToken}=useMaro();
  const itemId=params.get("item")??"";const provider=params.get("provider");
  const [item,setItem]=useState<Preview|null>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);const [submitted,setSubmitted]=useState(false);const key=useRef("");
  const [billing,setBilling]=useState({fullName:profile?.full_name??"",email:user?.email??"",city:"",country:"Kosovë",businessName:"",nui:"",legalConsent:false});
  const storageKey=`raiaccept:${user?.id}:${itemId}`;
  useEffect(()=>{
    const abort=new AbortController();
    void (async()=>{try {
      if (provider&&provider!=="raiaccept") throw new Error("invalid_item");
      const token=await getAccessToken();const headers={Authorization:`Bearer ${token}`};
      const saved=sessionStorage.getItem(storageKey);key.current=saved??crypto.randomUUID();
      if (saved) {
        const existing=await fetch(`/api/payments/raiaccept/status?requestKey=${encodeURIComponent(saved)}`,{headers,cache:"no-store",signal:abort.signal});
        if (existing.ok) {const state=await existing.json();router.replace(`/pay/raiaccept/return?orderId=${encodeURIComponent(state.order.id)}`);return;}
        if (existing.status!==404) throw new Error("temporarily_unavailable");
      }
      const response=await fetch(`/api/payments/raiaccept/preview?item=${encodeURIComponent(itemId)}`,{headers,cache:"no-store",signal:abort.signal});
      const data=await response.json();if (!response.ok) throw new Error(data.error??"temporarily_unavailable");
      if (!abort.signal.aborted) setItem(data.item);
    } catch(cause) {if (!abort.signal.aborted) setError(ERROR_MESSAGES[cause instanceof Error?cause.message:""]??"Porosia nuk u ngarkua. Provo sërish ose kontrollo porositë te llogaria.");}
    finally {if (!abort.signal.aborted) setLoading(false);}})();
    return ()=>abort.abort();
  },[getAccessToken,itemId,provider,router,storageKey]);
  async function submit(event:React.FormEvent) {
    event.preventDefault();if (busy||!item) return;setBusy(true);setSubmitted(true);setError("");
    try {
      sessionStorage.setItem(storageKey,key.current);const token=await getAccessToken();
      const response=await fetch("/api/payments/raiaccept/checkout",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","Idempotency-Key":key.current},
        body:JSON.stringify({itemId,...billing})});
      const data=await response.json();
      if (data.orderId) {
        if (response.ok&&data.state==="ready"&&typeof data.redirectUrl==="string") {
          const target=new URL(data.redirectUrl);
          if (target.origin!=="https://payment.raiaccept.com"||target.pathname!=="/checkout") throw new Error("invalid_redirect");
          window.location.assign(target.toString());return;
        }
        router.push(`/pay/raiaccept/return?orderId=${encodeURIComponent(data.orderId)}`);return;
      }
      throw new Error(data.error??"temporarily_unavailable");
    } catch(cause) {setError(ERROR_MESSAGES[cause instanceof Error?cause.message:""]??"Nuk e konfirmuam nisjen e pagesës. Provo sërish me të njëjtën kërkesë; mos nis porosi tjetër.");}
    finally {setBusy(false);}
  }
  return <AppShell showFooter><section className="mx-auto max-w-xl px-6 py-12">
    <h1 className="text-3xl font-bold text-ink">Përfundo porosinë</h1>
    {loading?<p className="mt-6 text-ink-2">Duke ngarkuar…</p>:item&&<>
      <div className="mt-6 rounded-2xl bg-surface p-6"><h2 className="text-xl font-semibold text-ink">{item.label}</h2>
        <p className="mt-2 text-ink-2">{item.credits} kredite · {(item.amountCents/100).toFixed(2)} {item.currency}</p>
        {item.orderKind!=="topup"&&<p className="mt-2 text-sm text-ink-2">{item.orderKind==="plan_upgrade"?"Përmirësimi ruan afatin e planit aktual.":`Plani zgjat ${item.durationDays??30} ditë; rinovimi bëhet manualisht.`}</p>}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <fieldset disabled={busy||submitted} className="space-y-4">
          {([{name:"fullName",label:"Emri dhe mbiemri",type:"text",required:true},{name:"email",label:"Email për faturën",type:"email",required:true},
            {name:"city",label:"Qyteti",type:"text",required:true},{name:"country",label:"Shteti",type:"text",required:true},
            {name:"businessName",label:"Emri i biznesit (opsionale)",type:"text",required:false},{name:"nui",label:"NUI (opsionale)",type:"text",required:false}] as const).map(field=><label key={field.name} className="block text-sm font-medium text-ink">
              {field.label}<input className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink" type={field.type} maxLength={200}
                required={field.required} value={billing[field.name]} onChange={event=>setBilling({...billing,[field.name]:event.target.value})}/>
            </label>)}
          <label className="flex items-start gap-3 text-sm text-ink-2"><input className="mt-1" type="checkbox" required checked={billing.legalConsent}
            onChange={event=>setBilling({...billing,legalConsent:event.target.checked})}/><span>Pranoj <Link className="underline" href="/legal/terms" target="_blank">kushtet e përdorimit</Link> dhe <Link className="underline" href="/legal/refund" target="_blank">politikën e rimbursimit</Link>.</span></label>
        </fieldset>
        <p className="text-sm text-ink-2">Kartën e vendos te checkout-i i sigurt i Raiffeisen Bank. Kjo është pagesë njëherëshe.</p>
        <button type="submit" disabled={busy||!billing.legalConsent} className="maro-button w-full disabled:opacity-50" data-variant="inverse">
          {busy?"Duke hapur pagesën…":submitted?"Provo të njëjtën kërkesë":`Vazhdo te pagesa · €${(item.amountCents/100).toFixed(2)}`}</button>
      </form>
    </>}
    {error&&<p role="alert" className="mt-5 text-ink">{error}</p>}
    <Link href="/account?tab=orders" className="mt-6 inline-block text-sm font-semibold underline">Porositë e mia</Link>
  </section></AppShell>;
}
