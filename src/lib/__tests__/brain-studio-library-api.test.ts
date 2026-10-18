import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({configured:vi.fn(),user:vi.fn(),from:vi.fn(),rpc:vi.fn(),policy:vi.fn(),rate:vi.fn(),storage:vi.fn(),remove:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({supabaseServerConfigured:mocks.configured,getUserFromToken:mocks.user,getSupabaseAdmin:()=>({from:mocks.from,rpc:mocks.rpc,storage:{from:mocks.storage}})}));
vi.mock("@/lib/workspaces/accountPolicyServer",async()=>({...await vi.importActual<typeof import("@/lib/workspaces/accountPolicyServer")>("@/lib/workspaces/accountPolicyServer"),requireBrainAccess:mocks.policy}));
vi.mock("@/lib/security/rateLimit",()=>({checkRateLimit:mocks.rate}));
import { GET, POST } from "@/app/api/brain/library/route";
import { POST as CLEAR } from "@/app/api/brain/clear/route";
import { flushStudioFiles } from "@/lib/brain-studio/libraryServer";
const MEMBER_ID = "11111111-aaaa-4111-8111-111111111111";
const owner=MEMBER_ID,workspaceId="ws_test",prefix=`${owner}/workspace-assets/${workspaceId}/`;
const base={workspaceId,resetAt:null,operation:{action:"create_folder",id:"folder",name:"Products"}};
const req=(input?:unknown)=>new Request(`https://maro.al/api/brain/library?workspaceId=${workspaceId}`,{method:input?"POST":"GET",headers:{Authorization:"Bearer fixture","Content-Type":"application/json"},...(input?{body:JSON.stringify(input)}:{})});
let workspace:Record<string,ReturnType<typeof vi.fn>>,folders:Record<string,ReturnType<typeof vi.fn>>,queue:Record<string,ReturnType<typeof vi.fn>>;
beforeEach(()=>{
  vi.resetAllMocks();mocks.configured.mockReturnValue(true);mocks.user.mockResolvedValue({id:owner,email:"member@example.test"});mocks.policy.mockResolvedValue({brainAccess:true,brainResetAt:null});mocks.rate.mockResolvedValue({allowed:true});mocks.rpc.mockResolvedValue({data:{paths:[]},error:null});
  workspace={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:workspaceId},error:null})};
  folders={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockResolvedValue({data:[{id:"folder",name:"Products"}],error:null})};
  queue={delete:vi.fn().mockReturnThis(),in:vi.fn().mockResolvedValue({error:null})};mocks.from.mockImplementation(table=>table==="workspaces"?workspace:table==="maro_brain_folders"?folders:queue);
  mocks.remove.mockResolvedValue({error:null});mocks.storage.mockReturnValue({remove:mocks.remove});
});
describe("workspace-owned Brain library API",()=>{
  it.each([GET,POST,CLEAR])("rejects guests and unavailable setup before data access",async handler=>{
    mocks.user.mockResolvedValueOnce(null);expect((await handler(req(base))).status).toBe(401);
    mocks.configured.mockReturnValue(false);expect((await handler(req(base))).status).toBe(503);expect(mocks.from).not.toHaveBeenCalled();
  });
  it("returns only scoped folders and no-store responses after checking ownership/plan",async()=>{
    const response=await GET(req());expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");expect(workspace.eq).toHaveBeenCalledWith("owner_id",owner);expect(folders.eq).toHaveBeenCalledWith("workspace_id",workspaceId);expect(mocks.policy).toHaveBeenCalledWith(owner,workspaceId);
    workspace.maybeSingle.mockResolvedValueOnce({data:null,error:null});expect((await GET(req())).status).toBe(404);
  });
  it("uses a transactional reset-aware mutation and rejects injected fields, stale epochs and excess writes",async()=>{
    expect((await POST(req({...base,ownerId:"other"}))).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();
    expect((await POST(req(base))).status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith("maro_studio_library",expect.objectContaining({p_user:owner,p_workspace:workspaceId,p_reset:null,p_action:"create_folder"}));
    mocks.policy.mockResolvedValueOnce({brainAccess:true,brainResetAt:"2026-10-17T01:00:00Z"});expect((await POST(req(base))).status).toBe(409);
    mocks.rate.mockResolvedValueOnce({allowed:false});expect((await POST(req(base))).status).toBe(429);
    mocks.rpc.mockResolvedValueOnce({error:{message:"BRAND_CONFLICT private data"}});const conflict=await POST(req(base));expect(conflict.status).toBe(409);expect(await conflict.text()).not.toContain("private data");
  });
  it("clears through one RPC and retains file cleanup jobs if Storage is temporarily unavailable",async()=>{
    mocks.rpc.mockResolvedValue({data:{paths:[prefix+"a.png"]},error:null});mocks.remove.mockResolvedValue({error:{message:"offline"}});
    const response=await CLEAR(req({workspaceId,resetAt:null,section:"sources",expected:{brand:{}},sourceIds:["source"]}));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({cleanupPending:true});expect(queue.in).not.toHaveBeenCalled();expect(mocks.rpc).toHaveBeenCalledWith("maro_studio_clear",expect.objectContaining({p_section:"sources",p_sources:["source"]}));
  });
  it("refuses a stale editor snapshot without first overwriting the other tab's profile",async()=>{
    workspace.maybeSingle.mockResolvedValue({data:{id:workspaceId,brain_profile:{target:{audience:"New in another tab"}}},error:null});
    const response=await CLEAR(req({workspaceId,resetAt:null,section:"goal",expected:{target:{audience:"Old text"}},sourceIds:[]}));
    expect(response.status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("compares normalized legacy profiles but sends the unchanged raw snapshot to the transactional clear",async()=>{
    const raw={brand:{logoUrl:`storage:generations/${prefix}logo.png`}};
    workspace.maybeSingle.mockResolvedValue({data:{id:workspaceId,brain_profile:raw,brand_name:"Legacy brand",brand_logo_url:null},error:null});
    const response=await CLEAR(req({workspaceId,resetAt:null,section:"goal",expected:{brand:{name:"Legacy brand",logoUrl:raw.brand.logoUrl,logoStorageRef:raw.brand.logoUrl}},sourceIds:[]}));
    expect(response.status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith("maro_studio_clear",expect.objectContaining({p_expected:raw}));
  });
  it("removes only queued workspace-owned assets, acknowledges after physical deletion and bounds cleanup work",async()=>{
    expect(await flushStudioFiles(owner,workspaceId,["other/workspace-assets/ws_test/a.png"])).toBe(true);expect(mocks.remove).not.toHaveBeenCalled();
    expect(await flushStudioFiles(owner,workspaceId,[prefix+"a.png"])).toBe(false);expect(mocks.storage).toHaveBeenCalledWith("generations");expect(queue.in).toHaveBeenCalledWith("path",[prefix+"a.png"]);
    mocks.remove.mockClear();expect(await flushStudioFiles(owner,workspaceId,Array.from({length:201},(_,index)=>prefix+index+".png"))).toBe(true);expect(mocks.remove).toHaveBeenCalledTimes(2);
  });
});
