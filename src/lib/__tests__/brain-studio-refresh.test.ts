import { describe, expect, it } from "vitest";
import { chooseLogoBackdrop } from "@/lib/brain-studio/logo";
import { libraryRequestSchema, clearRequestSchema } from "@/lib/brain-studio/operations";
import { buildBrainBrief, normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import { parseSectionAnswer, applySectionAnswer, buildSectionPrompt } from "@/lib/brain-studio/prompts";
import { parseAccountPolicy } from "@/lib/workspaces/accountPolicy";

describe("private Brain refresh data", () => {
  it("accepts a valid admin zero-storage cap without hiding paid Brain text data", () => {
    const policy={brainAccess:true,brainResetAt:null,brainDeleteAt:null,usedBytes:100,limitBytes:0};
    expect(parseAccountPolicy(policy)).toEqual(policy);
    expect(()=>parseAccountPolicy({...policy,limitBytes:-1})).toThrow();
  });
  it("shows black transparent artwork on light and white transparent artwork on dark, ignoring invisible pixels", () => {
    expect(chooseLogoBackdrop([0,0,0,255,255,255,255,0])).toBe("light");
    expect(chooseLogoBackdrop([255,255,255,255,0,0,0,0])).toBe("dark");
    expect(chooseLogoBackdrop([0,0,0,0])).toBe("light");
    expect(chooseLogoBackdrop([255,255,255,1,0,0,0,200])).toBe("light");
  });
  it("preserves and uses optional marketing context without adding empty fields to existing profiles", () => {
    const profile=emptyBrainProfile();
    expect(profile.target.buyingTriggers).toBeUndefined();
    const enriched=normalizeBrainProfile({...profile,brand:{...profile.brand,offering:"Coffee",mission:"Serve the community"},target:{...profile.target,buyingTriggers:"Morning",objections:"Price"},goal:{...profile.goal,timeframe:"Next quarter"},market:{...profile.market,proof:"Verified reviews"},content:{...profile.content,cta:"Order online",examples:"Good morning"}});
    expect(buildBrainBrief(enriched)).toContain("Buying triggers: Morning");
    expect(buildBrainBrief(enriched)).toContain("Evidence and trust: Verified reviews");
    expect(buildSectionPrompt(enriched,"target")).toContain('"buyingTriggers": "Morning"');
    const candidates=parseSectionAnswer(JSON.stringify({maroBrain:1,section:"target",fields:{buyingTriggers:"A new need"},suggestedFields:["buyingTriggers"]}),"target",profile);
    expect(applySectionAnswer(profile,"target",candidates,["buyingTriggers"]).target.buyingTriggers).toBe("A new need");
    expect(profile.target.buyingTriggers).toBeUndefined();
  });
  it("validates folder/source inputs and reset epochs while rejecting injected identity and unsupported files",()=>{
    const base={workspaceId:"ws_text",resetAt:null,operation:{action:"create_folder",id:"folder_1",name:"Products"}};
    expect(libraryRequestSchema.safeParse(base).success).toBe(true);
    expect(libraryRequestSchema.safeParse({...base,ownerId:"other"}).success).toBe(false);
    expect(libraryRequestSchema.safeParse({...base,operation:{...base.operation,name:" "}}).success).toBe(false);
    expect(libraryRequestSchema.safeParse({...base,operation:{action:"add_source",id:"a",name:"a",keywords:"",storageRef:"storage:generations/test",mimeType:"image/svg+xml",folderId:null}}).success).toBe(false);
    expect(clearRequestSchema.safeParse({workspaceId:"ws_text",resetAt:null,section:"all",expected:{},sourceIds:[]}).success).toBe(true);
    expect(clearRequestSchema.safeParse({workspaceId:"ws_text",resetAt:"bad",section:"all",expected:{},sourceIds:[]}).success).toBe(false);
  });
});
