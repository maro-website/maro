import {beforeEach, describe, expect, it, vi} from "vitest";
const mocks=vi.hoisted(()=>({job:vi.fn(),user:vi.fn()}));
vi.mock("@/lib/generation/jobs",()=>({getJob:mocks.job}));
vi.mock("@/lib/supabase/server",()=>({getUserFromToken:mocks.user,supabaseServerConfigured:()=>true}));
import {GET} from "@/app/api/jobs/[id]/route";
const request=()=>GET(new Request("http://localhost/api/jobs/job"),{params:Promise.resolve({id:"job"})});
describe("V1 owner job projection",()=>{
  beforeEach(()=>{mocks.user.mockResolvedValue({id:"owner"});mocks.job.mockResolvedValue({id:"job",user_id:"owner",module:"reklama",status:"completed",credits_reserved:0,credits_charged:5,metadata:{v1_durable:true,v1_request:{prompt:"PRIVATE"},image_provider:{error:{message:"RAW PROVIDER DETAIL"}}},error:"RAW SQL"});});
  it("returns durable state without raw diagnostics or configuration",async()=>{
    const response=await request();expect(await response.json()).toEqual({job:{id:"job",status:"completed",module:"reklama",credits_reserved:0,credits_charged:5}});
  });
  it("rejects another owner's job",async()=>{mocks.user.mockResolvedValue({id:"other"});expect((await request()).status).toBe(404);});
  it("requires authentication",async()=>{mocks.user.mockResolvedValue(null);expect((await request()).status).toBe(401);});
});
