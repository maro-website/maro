import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeBrainTool } from "@/lib/mcp/brainTools";
import { emptyMemoryMetadata, encodeMemoryCard, memoryFromRow } from "@/lib/brain-studio/memories";
import type { MaroMcpActor } from "@/lib/mcp/auth";

const mocks=vi.hoisted(()=>({active:vi.fn(),policy:vi.fn(),memories:vi.fn(),profile:vi.fn(),from:vi.fn(),rpc:vi.fn(),rows:[] as unknown[]}));
vi.mock("@/lib/supabase/server",()=>({getActiveWorkspaceId:mocks.active,getWorkspaceBrainProfile:mocks.profile,getWorkspaceSources:vi.fn(),getSupabaseAdmin:()=>({from:mocks.from,rpc:mocks.rpc})}));
vi.mock("@/lib/workspaces/accountPolicyServer",()=>({requireBrainAccess:mocks.policy}));
vi.mock("@/lib/brain-studio/server",()=>({loadStudioMemories:mocks.memories}));
const actor: MaroMcpActor={userId:"11111111-aaaa-4111-8111-111111111111",clientId:"brain",token:"test",expiresAt:4000000000,permissions:["brain:read","brain:write"]};
const metadata={...emptyMemoryMetadata(),title:"Coffee naming",kind:"rule" as const};
const card={key:"names",revision:3,content:"Keep coffee names unchanged",source:"Manual",createdAt:"2026-10-01T00:00:00Z",metadata};
const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockReturnThis(),lt:vi.fn().mockReturnThis(),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:mocks.rows,error:null}).then(resolve)};
beforeEach(()=>{
  vi.clearAllMocks();mocks.active.mockResolvedValue("ws_member");mocks.policy.mockResolvedValue({brainAccess:true});mocks.profile.mockResolvedValue(null);mocks.rows=[];
  mocks.memories.mockResolvedValue([card]);mocks.from.mockReturnValue(query);mocks.rpc.mockResolvedValue({data:{saved:true,revision:4},error:null});
});
describe("structured Brain memories for every authorized MCP member",()=>{
  it("searches the current member's decoded cards and excludes archived or expired context",async()=>{
    mocks.memories.mockResolvedValue([card,{...card,key:"archived",content:"DO_NOT_LEAK_ARCHIVE",metadata:{...metadata,archived:true}},{...card,key:"expired",content:"DO_NOT_LEAK_EXPIRY",metadata:{...metadata,expiresOn:"2000-01-01"}}]);
    const result=await executeBrainTool("search_maro_brand_memory",actor,{query:"coffee"});
    expect(mocks.memories).toHaveBeenCalledWith(actor.userId,"ws_member");expect(result.memories).toHaveLength(1);
    expect(result.brand_brief).toContain(card.content);expect(JSON.stringify(result)).not.toContain("DO_NOT_LEAK");
    expect(mocks.policy).toHaveBeenCalledWith(actor.userId,"ws_member");
  });
  it("preserves an existing card's metadata when this member explicitly edits its content",async()=>{
    await executeBrainTool("save_maro_brand_memory",actor,{key:card.key,content:"New coffee rule",source:"User decision",expected_revision:3});
    const [operation,payload]=mocks.rpc.mock.calls[0];expect(operation).toBe("maro_mcp_remember");
    expect(payload).toMatchObject({p_user:actor.userId,p_workspace:"ws_member",p_key:card.key,p_expected:3});
    expect(memoryFromRow({memory_key:card.key,revision:4,content:payload.p_content})?.metadata).toEqual(metadata);
    expect(memoryFromRow({memory_key:card.key,revision:4,content:payload.p_content})?.content).toBe("New coffee rule");
  });
  it("decodes member history while retaining its revision and account/workspace scope",async()=>{
    mocks.rows=[{memory_key:card.key,revision:3,content:encodeMemoryCard(card.content,metadata),source:"Manual",created_at:card.createdAt}];
    const result=await executeBrainTool("get_maro_brand_history",actor,{key:card.key});
    expect(result.history).toEqual([expect.objectContaining({revision:3,content:card.content,metadata})]);
    expect(query.eq).toHaveBeenCalledWith("owner_id",actor.userId);expect(query.eq).toHaveBeenCalledWith("workspace_id","ws_member");
  });
  it("refuses ineligible members before reading or saving their memory cards",async()=>{
    mocks.policy.mockRejectedValue(new Error("brain_plan_required"));
    await expect(executeBrainTool("save_maro_brand_memory",actor,{key:card.key,content:"No",source:"Manual",expected_revision:3})).rejects.toThrow("brain_plan_required");
    expect(mocks.memories).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
