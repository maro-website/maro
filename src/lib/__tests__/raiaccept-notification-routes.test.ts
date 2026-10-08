import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({rate:vi.fn(),enqueue:vi.fn(),client:vi.fn(),recover:vi.fn()}));
vi.mock("@/lib/security/rateLimit",()=>({enforceRateLimit:mocks.rate,clientIp:()=>"192.0.2.1"}));
vi.mock("@/lib/payments/raiaccept/recovery",()=>({createVerificationStore:()=>({enqueue:mocks.enqueue}),runRaiAcceptRecovery:mocks.recover}));
vi.mock("@/lib/payments/raiaccept/client",()=>({getRaiAcceptClient:mocks.client}));
vi.mock("@/lib/payments/raiaccept/receipts",()=>({deliverRaiAcceptReceipts:async()=>({claimed:0,sent:0,failed:0})}));
import { POST as webhook } from "@/app/api/payments/raiaccept/webhook/route";
import { POST as cron } from "@/app/api/cron/raiaccept-reconcile/route";

const hint={transaction:{transactionId:"P-007-TR-TEST",isProduction:false,status:"SUCCESS",transactionAmount:999999},
  merchant:{merchantAccountId:"P-007-MA-TEST"},order:{orderIdentification:"P-007-ORD-TEST",invoice:{merchantOrderReference:"MARO-S-TEST"}},
  card:{cardToken:"private-card-fixture"},consumer:{email:"private-customer@example.test"}};
function notification(body:unknown=hint) {return new Request("https://sandbox.example.test/api/payments/raiaccept/webhook",{method:"POST",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});}
function cronRequest(token:string|null="fixture-cron") {return new Request("https://sandbox.example.test/api/cron/raiaccept-reconcile",{
  method:"POST",headers:token?{Authorization:`Bearer ${token}`}:{}});}
beforeEach(()=>{
  vi.clearAllMocks(); mocks.rate.mockResolvedValue({allowed:true}); mocks.enqueue.mockResolvedValue(undefined);
  mocks.recover.mockResolvedValue({claimed:0,verified:0,failed:0,manualReview:0,issues:[]});
  for (const [name,value] of Object.entries({RAIACCEPT_ENABLED:"true",RAIACCEPT_CHECKOUT_ENABLED:"false",RAIACCEPT_RECOVERY_ENABLED:"true",
    RAIACCEPT_ENVIRONMENT:"sandbox",RAIACCEPT_MERCHANT_ACCOUNT_ID:"P-007-MA-TEST",RAIACCEPT_API_USERNAME:"fixture",RAIACCEPT_API_PASSWORD:"fixture",
    RAIACCEPT_DATABASE_PROJECT_REF:"a".repeat(20),NEXT_PUBLIC_SUPABASE_URL:`https://${"a".repeat(20)}.supabase.co`,
    APP_ORIGIN:"https://sandbox.example.test",CRON_SECRET:"fixture-cron"})) vi.stubEnv(name,value);
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("RaiAccept durable webhook boundary",()=>{
  it("accepts a hint while new checkouts are closed and discards financial/card fields",async()=>{
    expect((await webhook(notification())).status).toBe(202);
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({environment:"sandbox"}),"P-007-ORD-TEST","MARO-S-TEST");
    expect(JSON.stringify(mocks.enqueue.mock.calls)).not.toContain("private-card"); expect(mocks.client).not.toHaveBeenCalled();
  });
  it("awaits durable storage before acknowledging",async()=>{
    let finish:()=>void=()=>{}; let acknowledged=false;
    mocks.enqueue.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));
    const pending=webhook(notification()).then(response=>{acknowledged=true;return response;});
    await vi.waitFor(()=>expect(mocks.enqueue).toHaveBeenCalledOnce()); expect(acknowledged).toBe(false); finish();
    expect((await pending).status).toBe(202);
  });
  it("returns retryable failure without sensitive storage errors",async()=>{
    mocks.enqueue.mockRejectedValue(new Error("private-database-fixture")); const response=await webhook(notification());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-database");
  });
  it.each([null,[],{...hint,transaction:{...hint.transaction,isProduction:true}},
    {...hint,merchant:{merchantAccountId:"OTHER"}}])("rejects malformed or wrong-scope hints %j",async body=>{
    expect((await webhook(notification(body))).status).toBe(400); expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("bounds request size and applies strict rate limiting",async()=>{
    expect((await webhook(notification({...hint,extra:"x".repeat(33*1024)}))).status).toBe(413);
    mocks.rate.mockResolvedValue({allowed:false,retryAfter:10}); const response=await webhook(notification());
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("10"); expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
describe("RaiAccept privileged recovery route",()=>{
  it.each([null,"incorrect"])("rejects unauthorized cron %j",async token=>{
    expect((await cron(cronRequest(token))).status).toBe(401); expect(mocks.recover).not.toHaveBeenCalled();
  });
  it("requires a configured secret even in development",async()=>{
    vi.stubEnv("NODE_ENV","development"); vi.stubEnv("CRON_SECRET","");
    expect((await cron(cronRequest(null))).status).toBe(503); expect(mocks.recover).not.toHaveBeenCalled();
  });
  it("continues verifying paid/pending orders when checkout is disabled",async()=>{
    const response=await cron(cronRequest()); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.recover).toHaveBeenCalledOnce();
  });
  it("keeps recovery disabled until explicitly configured",async()=>{
    vi.stubEnv("RAIACCEPT_RECOVERY_ENABLED","false"); expect((await cron(cronRequest())).status).toBe(404);
    expect(mocks.recover).not.toHaveBeenCalled();
  });
  it("never exposes bank responses or credentials in cron errors",async()=>{
    vi.spyOn(console,"error").mockImplementation(()=>{}); mocks.recover.mockRejectedValue(new Error("private-bank-response"));
    const response=await cron(cronRequest()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-bank");
    expect(console.error).toHaveBeenCalledWith("raiaccept_recovery_unavailable");
  });
});
