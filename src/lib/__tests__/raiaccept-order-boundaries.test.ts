import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),state:vi.fn(),order:vi.fn(),rate:vi.fn(),enqueue:vi.fn(),recover:vi.fn(),client:vi.fn(),pdf:vi.fn()}));
vi.mock("@/lib/payments/invoicePdf",()=>({buildInvoicePdf:mocks.pdf}));
vi.mock("@/lib/payments/auth",()=>({requireUser:mocks.auth}));
vi.mock("@/lib/payments/raiaccept/orderState",async importOriginal=>({...await importOriginal<typeof import("@/lib/payments/raiaccept/orderState")>(),getRaiAcceptOrderState:mocks.state}));
vi.mock("@/lib/payments/orders",async importOriginal=>({...await importOriginal<typeof import("@/lib/payments/orders")>(),getOrderForUser:mocks.order}));
vi.mock("@/lib/security/rateLimit",()=>({enforceRateLimit:mocks.rate}));
vi.mock("@/lib/payments/raiaccept/recovery",()=>({createVerificationStore:()=>({enqueue:mocks.enqueue}),runRaiAcceptRecovery:mocks.recover}));
vi.mock("@/lib/payments/raiaccept/client",()=>({getRaiAcceptClient:mocks.client}));
import { GET as status } from "@/app/api/payments/raiaccept/status/route";
import { POST as verify } from "@/app/api/payments/raiaccept/verify/route";
import { GET as invoice } from "@/app/api/payments/invoice/route";
import { raiAcceptPaymentMessage } from "@/lib/payments/raiaccept/presentation";
import { buildRaiAcceptReceipt } from "@/lib/payments/raiaccept/receipts";
import { buildInvoiceHtml } from "@/lib/payments/invoiceHtml";
import type { CreditOrderRow } from "@/lib/payments/orders";
const user="11111111-1111-4111-8111-111111111111";const id="22222222-2222-4222-8222-222222222222";
const order:CreditOrderRow={id,user_id:user,user_email:"test@example.test",credits:100,amount_cents:900,currency:"EUR",status:"paid",provider:"raiaccept",
  item_type:"plan",item_id:"standard",order_kind:"plan_purchase",membership_id:null,commercial_snapshot:null,
  billing_snapshot:{fullName:'<img src=x onerror="alert(1)">',email:"test@example.test",country:"Kosovë",city:"Prishtinë",legalConsent:true},created_at:"2026-10-08T12:00:00Z"};
const state={order_id:id,user_id:user,environment:"sandbox",merchant_account_id:"P-007-MA-TEST",merchant_reference:"MARO-S-TEST",provider_order_id:"P-007-ORD-TEST",
  payment_state:"paid",fulfillment_state:"fulfilled",review_reason:null,session_state:"ready",session_id:"private-session",redirect_url:"https://payment.raiaccept.com/checkout?paymentSession=private-session",last_verified_at:"2026-10-08T12:00:00Z"};
const getReq=(path:string)=>new Request(`https://sandbox.example.test${path}?orderId=${id}`);
const verifyReq=()=>new Request("https://sandbox.example.test/api/payments/raiaccept/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:id,result:"success",transaction:{status:"SUCCESS",amount:1}})});
beforeEach(()=>{
  vi.clearAllMocks();mocks.auth.mockResolvedValue({id:user});mocks.state.mockResolvedValue(state);mocks.order.mockResolvedValue(order);
  mocks.rate.mockResolvedValue({allowed:true});mocks.enqueue.mockResolvedValue(undefined);mocks.recover.mockResolvedValue({});
  mocks.pdf.mockResolvedValue(new TextEncoder().encode("%PDF-1.7 fixture"));
  for(const [name,value] of Object.entries({RAIACCEPT_ENABLED:"true",RAIACCEPT_ENVIRONMENT:"sandbox",RAIACCEPT_MERCHANT_ACCOUNT_ID:"P-007-MA-TEST",
    RAIACCEPT_API_USERNAME:"fixture",RAIACCEPT_API_PASSWORD:"fixture",RAIACCEPT_DATABASE_PROJECT_REF:"a".repeat(20),
    NEXT_PUBLIC_SUPABASE_URL:`https://${"a".repeat(20)}.supabase.co`,APP_ORIGIN:"https://sandbox.example.test"})) vi.stubEnv(name,value);
});
afterEach(()=>vi.unstubAllEnvs());
describe("Owned RaiAccept order, confirmation and invoice boundaries",()=>{
  it.each([status,invoice])("requires authentication before loading private orders",async handler=>{
    mocks.auth.mockResolvedValue(null);expect((await handler(getReq("/api/payments/order"))).status).toBe(401);expect(mocks.state).not.toHaveBeenCalled();
  });
  it("cannot load or verify another user's order",async()=>{
    mocks.state.mockResolvedValue(null);mocks.order.mockResolvedValue(null);
    expect((await status(getReq("/api/payments/raiaccept/status"))).status).toBe(404);
    expect((await verify(verifyReq())).status).toBe(404);expect((await invoice(getReq("/api/payments/invoice"))).status).toBe(404);
    expect(mocks.state).toHaveBeenCalledWith(user,{orderId:id});expect(mocks.recover).not.toHaveBeenCalled();
  });
  it("status reads never fulfill and never return paid checkout sessions",async()=>{
    const response=await status(getReq("/api/payments/raiaccept/status"));const body=await response.json();
    expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("private-session");expect(mocks.recover).not.toHaveBeenCalled();
  });
  it("ignores forged redirect/payment fields and limits verification to the owned order",async()=>{
    expect((await verify(verifyReq())).status).toBe(200);
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.any(Object),state.provider_order_id,state.merchant_reference);
    expect(mocks.recover.mock.calls[0][3]).toBe(id);expect(JSON.stringify(mocks.recover.mock.calls)).not.toContain("SUCCESS");
  });
  it("cannot verify an order in another environment",async()=>{
    mocks.state.mockResolvedValue({...state,environment:"production"});expect((await verify(verifyReq())).status).toBe(404);expect(mocks.recover).not.toHaveBeenCalled();
  });
  it("refuses an invoice until the bank has verified the payment",async()=>{
    mocks.state.mockResolvedValue({...state,payment_state:"unverified"});expect((await invoice(getReq("/api/payments/invoice"))).status).toBe(409);
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("escapes billing HTML, freezes invoice price and labels refunds",async()=>{
    const html=buildInvoiceHtml(order,"fully_refunded");expect(html).not.toContain('<img src=x');expect(html).toContain("&lt;img");expect(html).toContain("rimbursuar plotësisht");
    const response=await invoice(getReq("/api/payments/invoice"));expect(response.headers.get("Cache-Control")).toBe("private, no-store");expect(response.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(`fatura-${id.slice(0,8)}.pdf`);
    expect(await response.text()).toBe("%PDF-1.7 fixture");expect(mocks.pdf).toHaveBeenCalledWith(order,"paid");
  });
  it("returns a retryable failure when PDF rendering is unavailable",async()=>{
    mocks.pdf.mockRejectedValue(new Error("renderer failed"));const response=await invoice(getReq("/api/payments/invoice"));
    expect(response.status).toBe(503);expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toEqual({error:"invoice_temporarily_unavailable"});
  });
  it("never says credits are granted when a paid payment is in manual review",()=>{
    expect(raiAcceptPaymentMessage("paid","manual_review",true).title).toBe("Pagesa po shqyrtohet");
    expect(raiAcceptPaymentMessage("unverified","pending",false).title).toBe("Po verifikojmë pagesën");
    expect(raiAcceptPaymentMessage("fully_refunded","fulfilled",true).title).toBe("Pagesa është rimbursuar");
  });
  it("creates a receipt from the exact paid order with stable provider idempotency",()=>{
    const receipt=buildRaiAcceptReceipt(order,"https://maro.al");expect(receipt.idempotencyKey).toBe(`raiaccept-receipt-${id}`);
    expect(receipt.text).toContain("9.00 EUR");expect(receipt.html).not.toContain("<img src=x");
    expect(receipt.html).toContain("Shiko faturën PDF");expect(receipt.html).toContain("Vazhdo në maro");
    expect(receipt.html).toContain('href="https://maro.al/account?tab=orders"');expect(receipt.html).toContain('bgcolor="#00ff72"');
    expect(()=>buildRaiAcceptReceipt(order,"javascript:alert(1)")).toThrow();
    expect(()=>buildRaiAcceptReceipt({...order,status:"pending"},"https://maro.al")).toThrow();
  });
});
