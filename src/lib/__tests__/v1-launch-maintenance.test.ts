import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ configured:vi.fn(), auth:vi.fn(), stale:vi.fn(), brains:vi.fn(), accounting:vi.fn(), retention:vi.fn(), reminders:vi.fn(), remove:vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured:mocks.configured, getSupabaseAdmin:()=>({from:()=>({delete:()=>({lt:mocks.remove})})}) }));
vi.mock("@/lib/security/cronAuth", () => ({authorizeCronRequest:mocks.auth}));
vi.mock("@/lib/generation/jobs", () => ({cleanupStaleJobs:mocks.stale}));
vi.mock("@/lib/workspaces/accountPolicyServer", () => ({cleanupExpiredBrains:mocks.brains}));
vi.mock("@/lib/operations/accountingRepair", () => ({repairGenerationAccounting:mocks.accounting}));
vi.mock("@/lib/operations/retention", () => ({runGenerationDebugRetention:mocks.retention}));
vi.mock("@/lib/commerce/notifications", () => ({runPlanRenewalReminders:mocks.reminders}));
import {POST} from "@/app/api/cron/reconcile-stale-jobs/route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true); mocks.auth.mockReturnValue("ok");
  mocks.brains.mockResolvedValue(0); mocks.accounting.mockResolvedValue(2);
  mocks.retention.mockResolvedValue({ok:true,rowsAffected:4});
  mocks.remove.mockResolvedValue({error:null}); mocks.reminders.mockResolvedValue({sent:0});
});
describe("existing maintenance runner", () => {
  it("does not run privileged work without a valid secret", async () => {
    mocks.auth.mockReturnValue("unauthorized");
    expect((await POST(new Request("http://localhost/api/cron/reconcile-stale-jobs",{method:"POST"}))).status).toBe(401);
    for (const fn of [mocks.stale,mocks.brains,mocks.accounting,mocks.retention,mocks.remove,mocks.reminders]) expect(fn).not.toHaveBeenCalled();
  });
  it("acknowledges the existing runner only after all maintenance succeeds", async () => {
    const response = await POST(new Request("http://localhost",{method:"POST"}));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ok:true,staleJobsReconciled:true,accountingRepaired:2,retentionRows:4});
    expect(mocks.reminders).toHaveBeenCalledOnce();
  });
  it.each(["stale","brains","accounting","retention","remove","reminders"])("returns a retryable failure when %s fails", async name => {
    mocks[name as keyof typeof mocks].mockRejectedValue(new Error("private database details"));
    const response=await POST(new Request("http://localhost",{method:"POST"}));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({error:"maintenance_failed"});
  });
  it("does not report success when an SDK returns an error object", async () => {
    mocks.remove.mockResolvedValue({error:{message:"private"}});
    expect((await POST(new Request("http://localhost",{method:"POST"}))).status).toBe(503);
    expect(mocks.reminders).not.toHaveBeenCalled();
  });
  it("does not acknowledge a failed retention result", async () => {
    mocks.retention.mockResolvedValue({ok:false,rowsAffected:0});
    expect((await POST(new Request("http://localhost",{method:"POST"}))).status).toBe(503);
  });
});
