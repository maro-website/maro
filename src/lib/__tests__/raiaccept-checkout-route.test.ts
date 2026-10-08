import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),rate:vi.fn(),start:vi.fn(),client:vi.fn()}));
vi.mock("@/lib/payments/auth",()=>({requireUser:mocks.auth}));
vi.mock("@/lib/security/rateLimit",()=>({enforceRateLimit:mocks.rate}));
vi.mock("@/lib/payments/raiaccept/checkout",()=>({startRaiAcceptCheckout:mocks.start}));
vi.mock("@/lib/payments/raiaccept/client",()=>({getRaiAcceptClient:mocks.client}));
import { POST } from "@/app/api/payments/raiaccept/checkout/route";

const user="11111111-1111-4111-8111-111111111111";
const key="22222222-2222-4222-8222-222222222222";
const details={itemId:"standard",fullName:"Sandbox Test",email:"sandbox@example.test",country:"Kosovo",city:"Prishtinë",legalConsent:true};
function request(body:unknown=details,idempotency:string|null=key) {
  return new Request("https://sandbox.example.test/api/payments/raiaccept/checkout",{
    method:"POST",headers:{Authorization:"Bearer fixture","Content-Type":"application/json",...(idempotency?{"Idempotency-Key":idempotency}:{})},body:JSON.stringify(body),
  });
}
beforeEach(()=>{
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({id:user}); mocks.rate.mockResolvedValue({allowed:true});
  mocks.start.mockResolvedValue({orderId:key,state:"ready",redirectUrl:"https://payment.raiaccept.com/checkout?paymentSession=safe"});
  for (const [name,value] of Object.entries({RAIACCEPT_ENABLED:"true",RAIACCEPT_CHECKOUT_ENABLED:"true",RAIACCEPT_RECOVERY_ENABLED:"true",CRON_SECRET:"fixture-cron",RAIACCEPT_ENVIRONMENT:"sandbox",
    RAIACCEPT_CHECKOUT_USER_IDS:user,RAIACCEPT_PUBLIC_RELEASE:"false",RAIACCEPT_MERCHANT_ACCOUNT_ID:"P-007-MA-test",
    RAIACCEPT_API_USERNAME:"fixture",RAIACCEPT_API_PASSWORD:"fixture",RAIACCEPT_DATABASE_PROJECT_REF:"a".repeat(20),
    NEXT_PUBLIC_SUPABASE_URL:`https://${"a".repeat(20)}.supabase.co`,APP_ORIGIN:"https://sandbox.example.test"})) vi.stubEnv(name,value);
});
afterEach(()=>vi.unstubAllEnvs());
describe("RaiAccept authenticated checkout boundary",()=>{
  it("stays closed by default before authentication or database access",async()=>{
    vi.stubEnv("RAIACCEPT_CHECKOUT_ENABLED","false"); expect((await POST(request())).status).toBe(404);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("requires an authenticated account",async()=>{
    mocks.auth.mockResolvedValue(null); expect((await POST(request())).status).toBe(401); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("restricts controlled checkout to the allowlisted user",async()=>{
    mocks.auth.mockResolvedValue({id:"33333333-3333-4333-8333-333333333333"}); expect((await POST(request())).status).toBe(404);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("enforces rate limiting",async()=>{
    mocks.rate.mockResolvedValue({allowed:false,retryAfter:60}); const response=await POST(request());
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("60"); expect(mocks.start).not.toHaveBeenCalled();
  });
  it.each([null,"not-a-uuid",`${key.slice(0,12)} ${key.slice(12)}`])("requires a valid stable idempotency key %j",async invalid=>{
    expect((await POST(request(details,invalid))).status).toBe(400); expect(mocks.start).not.toHaveBeenCalled();
  });
  it.each([null,[],{...details,legalConsent:false},{...details,email:"invalid"},{...details,fullName:"x".repeat(201)},
    {...details,city:"test\u0000"},{...details,businessName:"x".repeat(201)}])("rejects malformed billing %j",async body=>{
    expect((await POST(request(body))).status).toBe(400); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("limits the streamed body size",async()=>{
    expect((await POST(request({...details,extra:"x".repeat(33*1024)}))).status).toBe(413); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("disables discounts until their final price is supported",async()=>{
    expect((await POST(request({...details,promoCode:"DISCOUNT"}))).status).toBe(400); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("uses the authenticated owner and omits browser prices and credits",async()=>{
    const response=await POST(request({...details,userId:"someone-else",amount_cents:1,credits:999999}));
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
    const {itemId,...billing}=details;
    expect(mocks.start.mock.calls[0][0]).toEqual({userId:user,requestKey:key,itemId,billing});
  });
  it("refuses Sandbox connected to the production database",async()=>{
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://pbhzobqpavkuttdipjaq.supabase.co");
    vi.stubEnv("RAIACCEPT_DATABASE_PROJECT_REF","pbhzobqpavkuttdipjaq");
    expect((await POST(request())).status).toBe(503); expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.client).not.toHaveBeenCalled();
  });
  it("returns durable uncertainty without a redirect",async()=>{
    mocks.start.mockResolvedValue({orderId:key,state:"review"}); const response=await POST(request());
    expect(response.status).toBe(202); expect(await response.json()).toEqual({orderId:key,state:"review"});
  });
  it("returns an eligibility or key conflict without raw errors",async()=>{
    mocks.start.mockResolvedValue({error:"idempotency_conflict"}); expect((await POST(request())).status).toBe(409);
    mocks.start.mockRejectedValue(new Error("fixture-sensitive-database-message")); const response=await POST(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("fixture-sensitive");
  });
});
