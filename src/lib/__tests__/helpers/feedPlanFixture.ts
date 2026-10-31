import type { FeedDesign } from "@/lib/feed/campaign";
import { feedLayouts, type FeedCampaignPlan } from "@/lib/feed/plan";
export function feedPlanFixture(design: FeedDesign): FeedCampaignPlan {
  const headlines = ["Një ide për festat.", "Bashkë në këtë stinë.", "", "Një pauzë për ty.", "Ngjyra që festojnë.", "Rituali yt i preferuar.", "", "Cilën zgjedh ti?", "Zgjidhe momentin tënd."];
  const scenes = [
    "One iconic original product on a burgundy seamless studio plinth with sculpted rim lighting and a quiet upper backdrop.",
    "A wide candid gathering in a winter conservatory, the original offering held by an anonymous guest with soft daylight.",
    "Extreme macro of the actual cap and condensation under icy side lighting, cropped tightly to reveal tactile surface detail.",
    "A flat cream graphic composition with generous left negative space and the exact product as a small supporting right-hand element.",
    "An asymmetrical dimensional arrangement of originals among folded scarlet paper sculptures, floating visual rhythm and directional shadows.",
    "Hands opening the original offering in a believable kitchen ritual, documentary action crop and intimate practical warmth.",
    "Quiet snowy window atmosphere with reflective material, a barely dominant faithful object and cinematic sensory backlighting.",
    "Playful asymmetric overhead composition on a restrained green graphic set, distinct original products spaced apart around a clear question area.",
    "Clean decisive closing card with an elevated original product against a rich cobalt gradient, strong hierarchy and quiet lower invitation space.",
  ];
  return { version: "maro-feed-plan/1", optimizer: { attemptId: "optimizer-attempt", model: "gpt-6.1-sol", sourceHash: "a".repeat(64) },
    look: "A refined festive campaign with burgundy, green, cream and controlled seasonal lighting; original packaging colors stay exact.",
    sources: design.assets.filter(asset => asset.role === "product").map(asset => ({ index: asset.index, kind: "single", products: [{ name: asset.label, identity: "Exact original package, proportions, colors and printed label" }] })),
    posts: design.assignments.map((row, slot) => ({ slot, layout: feedLayouts[slot], concept: `${feedLayouts[slot]} concept with a distinct visual mechanism`, scene: scenes[slot], camera: (["front", "eye-level", "macro", "side", "diagonal", "low", "backlit", "overhead", "wide"] as const)[slot], subjects: row.map(reference => ({ reference, product: design.assets.find(asset => asset.index === reference)!.label })), headline: headlines[slot], evidence: [] })),
  };
}
