import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), download: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ rpc: mocks.rpc, storage: { from: () => ({ upload: mocks.upload, download: mocks.download }) } }) }));
import { storeV1ImageOutput, persistV1ImageHistory, settleV1ImageJob, failV1ImageJob, v1OutputReference } from "@/lib/generation/v1ImagePersistence";
const user="11111111-1111-4111-8111-111111111111", job="22222222-2222-4222-8222-222222222222", generation="33333333-3333-4333-8333-333333333333";
const { path, reference }=v1OutputReference(user,job);
let image: Buffer;
beforeEach(async()=>{
  vi.resetAllMocks(); image=await sharp({create:{width:2,height:2,channels:3,background:"green"}}).png().toBuffer();
  mocks.rpc.mockResolvedValue({data:true,error:null});mocks.upload.mockResolvedValue({data:{path},error:null});
  mocks.download.mockResolvedValue({data:new Blob([new Uint8Array(image)]),error:null});
});
describe("verified durable storage",()=>{
  it("returns only the verified private owner/job reference",async()=>{
    expect(await storeV1ImageOutput(user,job,[image.toString("base64")])).toBe(reference);
    expect(mocks.upload).toHaveBeenCalledWith(path,expect.any(Buffer),{contentType:"image/png",upsert:false});
    expect(mocks.download).toHaveBeenCalledWith(path);
    expect(mocks.rpc).toHaveBeenCalledWith("mark_v1_image_provider_result",expect.objectContaining({p_job_id:job,p_sha256:expect.stringMatching(/^[a-f0-9]{64}$/)}));
  });
  it.each([{outputs:[]},{outputs:["bad"]},{outputs:["bad","bad"]}])("rejects invalid/count-mismatched provider output before storage: %j",async ({outputs})=>{
    await expect(storeV1ImageOutput(user,job,outputs)).rejects.toMatchObject({code:"provider_output_invalid"});expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("fully decodes valid-looking but truncated image bytes",async()=>{await expect(storeV1ImageOutput(user,job,[image.subarray(0,25).toString("base64")])).rejects.toMatchObject({code:"provider_output_invalid"});});
  it("fails if the provider checkpoint cannot be committed",async()=>{mocks.rpc.mockResolvedValue({data:false,error:null});await expect(storeV1ImageOutput(user,job,[image.toString("base64")])).rejects.toMatchObject({code:"storage_failed"});expect(mocks.upload).not.toHaveBeenCalled();});
  it("upload error plus missing object is a storage failure",async()=>{mocks.upload.mockResolvedValue({data:null,error:{message:"upload"}});mocks.download.mockResolvedValue({data:null,error:{message:"missing"}});await expect(storeV1ImageOutput(user,job,[image.toString("base64")])).rejects.toMatchObject({code:"storage_failed"});});
  it("upload success alone is insufficient",async()=>{mocks.download.mockResolvedValue({data:null,error:{message:"missing"}});await expect(storeV1ImageOutput(user,job,[image.toString("base64")])).rejects.toMatchObject({code:"storage_failed"});});
  it("wrong bytes cannot satisfy verification",async()=>{mocks.download.mockResolvedValue({data:new Blob(["wrong"]),error:null});await expect(storeV1ImageOutput(user,job,[image.toString("base64")])).rejects.toMatchObject({code:"storage_failed"});});
  it("wrong returned path cannot satisfy verification",async()=>{mocks.upload.mockResolvedValue({data:{path:"other/file.png"},error:null});await expect(storeV1ImageOutput(user,job,[image.toString("base64")])).rejects.toMatchObject({code:"storage_failed"});});
  it("recovers a committed upload after a lost upload response without overwriting",async()=>{mocks.upload.mockResolvedValue({data:null,error:{message:"transport timeout"}});expect(await storeV1ImageOutput(user,job,[image.toString("base64")])).toBe(reference);});
});
describe("required history and verified settlement",()=>{
  it.each([null,"", "not-a-uuid",false])("rejects unusable history ID %j",async data=>{mocks.rpc.mockResolvedValue({data,error:null});await expect(persistV1ImageHistory(job)).rejects.toMatchObject({code:"history_failed"});});
  it("accepts a durable UUID returned by the transactional history RPC",async()=>{mocks.rpc.mockResolvedValue({data:generation,error:null});expect(await persistV1ImageHistory(job)).toBe(generation);});
  it("database history errors are safe and cannot leak details",async()=>{mocks.rpc.mockResolvedValue({data:null,error:{message:"secret detail"}});await expect(persistV1ImageHistory(job)).rejects.toThrow("history_failed");});
  it.each(["finalized","already_finalized","invalid_state","evidence_missing","settlement_pending"])("distinguishes %s",async result=>{mocks.rpc.mockResolvedValue({data:result,error:null});expect(await settleV1ImageJob(job)).toBe(result);});
  it("retries an uncertain commit and accepts a verified already-finalized result",async()=>{mocks.rpc.mockResolvedValueOnce({data:null,error:{message:"timeout"}}).mockResolvedValueOnce({data:"already_finalized",error:null});expect(await settleV1ImageJob(job)).toBe("already_finalized");expect(mocks.rpc).toHaveBeenCalledTimes(2);});
  it("an unverified finalization remains pending with no release",async()=>{mocks.rpc.mockRejectedValue(new Error("offline"));expect(await settleV1ImageJob(job)).toBe("settlement_pending");expect(mocks.rpc.mock.calls.every(([name])=>name==="settle_v1_image_job")).toBe(true);});
  it("release uncertainty never claims a refund",async()=>{mocks.rpc.mockRejectedValue(new Error("offline"));expect(await failV1ImageJob(job,"storage_failed")).toBe("reconciliation_pending");});
});
