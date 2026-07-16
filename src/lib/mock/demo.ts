import type {
  Project,
  WebsiteCategory,
  StyleKey,
  GenerationMode,
  LanguageCode,
  Asset,
  Version,
  ChatMessage,
  CreditTransaction,
} from "@/lib/types";
import { CATEGORY_THEMES, applyStyle } from "./themes";
import { buildPages } from "./factory";
import { genImage } from "./images";
import { uid, slugify } from "@/lib/utils/format";

interface MakeInput {
  id?: string;
  name: string;
  businessName: string;
  tagline?: string;
  goal: string;
  category: WebsiteCategory;
  style?: StyleKey;
  language?: LanguageCode;
  mode?: GenerationMode;
  email?: string;
  phone?: string;
  location?: string;
  status?: Project["status"];
  logoUrl?: string;
  primaryColor?: string;
  ageMinutes?: number;
}

export function makeProject(inp: MakeInput): Project {
  const baseTheme = applyStyle(
    { ...CATEGORY_THEMES[inp.category] },
    inp.style ?? "auto"
  );
  if (inp.primaryColor) baseTheme.primaryColor = inp.primaryColor;

  const pages = buildPages({
    businessName: inp.businessName,
    tagline: inp.tagline,
    category: inp.category,
    email: inp.email,
    phone: inp.phone,
    location: inp.location,
  });

  const now = Date.now();
  const created = new Date(now - (inp.ageMinutes ?? 0) * 60_000).toISOString();

  const builtInAssets: Asset[] = [
    { id: uid("as"), name: "hero.jpg", url: genImage({ seed: inp.name + "a1", category: inp.category, w: 600, h: 400, variant: 0 }), category: "brand", createdAt: created },
    { id: uid("as"), name: "gallery-01.jpg", url: genImage({ seed: inp.name + "a2", category: inp.category, w: 600, h: 400, variant: 1 }), category: "products", createdAt: created },
    { id: uid("as"), name: "gallery-02.jpg", url: genImage({ seed: inp.name + "a3", category: inp.category, w: 600, h: 400, variant: 2 }), category: "products", createdAt: created },
    { id: uid("as"), name: "team.jpg", url: genImage({ seed: inp.name + "a4", category: inp.category, w: 600, h: 400, variant: 0 }), category: "team", createdAt: created },
  ];

  const theme = baseTheme;
  const initialVersion: Version = {
    id: uid("ver"),
    label: "Gjenerimi fillestar",
    createdAt: created,
    snapshot: { theme: { ...theme }, pages },
  };

  const slug = slugify(inp.businessName);
  const previewUrl = `${slug}.maro.al`;

  return {
    id: inp.id ?? uid("proj"),
    name: inp.name,
    businessName: inp.businessName,
    tagline: inp.tagline,
    email: inp.email,
    phone: inp.phone,
    location: inp.location,
    goal: inp.goal,
    language: inp.language ?? "sq",
    category: inp.category,
    style: inp.style ?? "auto",
    generationMode: inp.mode ?? "smart",
    status: inp.status ?? "ready",
    brand: {
      hasLogo: !!inp.logoUrl,
      logoUrl: inp.logoUrl,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
    },
    theme,
    pages,
    activePageId: pages[0].id,
    assets: builtInAssets,
    conversation: { id: uid("conv"), messages: [] },
    versions: [initialVersion],
    credits: [
      {
        id: uid("ct"),
        label: "Gjenerimi fillestar",
        amount: -20,
        reason: "generation",
        createdAt: created,
      },
    ],
    previewUrl,
    publishedUrl: inp.status === "published" ? previewUrl : undefined,
    createdAt: created,
    updatedAt: created,
  };
}

function chat(role: ChatMessage["role"], content: string, minsAgo: number): ChatMessage {
  return {
    id: uid("msg"),
    role,
    content,
    status: "done",
    createdAt: new Date(Date.now() - minsAgo * 60_000).toISOString(),
  };
}

// ---- Flagship demo project: NICE Creative Agency ----
export function makeNiceAgency(): Project {
  const p = makeProject({
    id: "demo-nice",
    name: "NICE Creative Agency",
    businessName: "NICE Studio",
    tagline: "We build brands people remember.",
    goal: "A bold editorial agency site that shows our work and converts inbound leads.",
    category: "agency",
    style: "editorial",
    language: "en",
    mode: "maximum",
    email: "hello@nicestudio.com",
    phone: "+383 44 333 444",
    location: "Prishtinë · Remote worldwide",
    status: "published",
    ageMinutes: 60 * 26,
  });

  p.conversation.messages = [
    chat("assistant", "Website-i është gati.\n\nMundesh me më tregu çka dëshiron me ndryshu, ose kliko direkt mbi elementet në website.", 25),
    chat("user", "Make the hero more premium", 22),
    chat("assistant", "Ndryshimet u krynë. E bëra hero-n më premium — kontrast më i fortë dhe hapësirë më e madhe.", 21),
    chat("user", "Add a pricing section", 12),
    chat("assistant", "Ndryshimet u krynë. Shtova një pricing section me tri plane.", 11),
  ];

  const extraVersions: Version[] = [
    { id: uid("ver"), label: "Ndryshova hero-n", createdAt: new Date(Date.now() - 21 * 60_000).toISOString(), snapshot: { theme: { ...p.theme }, pages: p.pages } },
    { id: uid("ver"), label: "Përditësova brand colors", createdAt: new Date(Date.now() - 4 * 60_000).toISOString(), snapshot: { theme: { ...p.theme }, pages: p.pages } },
  ];
  p.versions = [...p.versions, ...extraVersions];

  const extraCredits: CreditTransaction[] = [
    { id: uid("ct"), label: "Hero redesign", amount: -5, reason: "ai-edit", createdAt: new Date(Date.now() - 21 * 60_000).toISOString() },
    { id: uid("ct"), label: "Shtova pricing section", amount: -10, reason: "large-ai-edit", createdAt: new Date(Date.now() - 11 * 60_000).toISOString() },
  ];
  p.credits = [...p.credits, ...extraCredits];
  p.updatedAt = new Date(Date.now() - 4 * 60_000).toISOString();
  return p;
}

// ---- Second demo project: Castello Branco ----
export function makeCastello(): Project {
  const p = makeProject({
    id: "demo-castello",
    name: "Castello Branco",
    businessName: "Castello Branco",
    tagline: "Kuzhinë mesdhetare në zemër të qytetit.",
    goal: "Website premium për restorantin me menu, galeri dhe rezervime.",
    category: "restaurant",
    style: "premium",
    language: "sq",
    mode: "smart",
    email: "rezervime@castello.al",
    phone: "+383 44 777 888",
    location: "Rr. Nëna Terezë 12, Prishtinë",
    status: "published",
    ageMinutes: 60 * 5,
  });
  p.conversation.messages = [
    chat("assistant", "Website-i është gati.\n\nMundesh me më tregu çka dëshiron me ndryshu, ose kliko direkt mbi elementet në website.", 30),
    chat("user", "Bëje website-in më premium", 26),
    chat("assistant", "Ndryshimet u krynë. E ngrita nivelin premium — tipografi më elegante dhe hapësira më e ajrosur.", 25),
  ];
  p.updatedAt = new Date(Date.now() - 25 * 60_000).toISOString();
  return p;
}

// ---- Dashboard seed (feels like a real account) ----
export function seedProjects(): Project[] {
  const nice = makeNiceAgency();
  const castello = makeCastello();

  const dental = makeProject({
    id: "seed-dental",
    name: "Dental Studio",
    businessName: "Dental Studio",
    tagline: "Buzëqeshje të shëndetshme.",
    goal: "Website për klinikën dentare.",
    category: "dentist",
    style: "modern",
    status: "generating",
    ageMinutes: 3,
  });

  const beton = makeProject({
    id: "seed-beton",
    name: "Beton Group",
    businessName: "Beton Group",
    tagline: "Ndërtojmë hapësira që zgjasin.",
    goal: "Website për kompaninë e ndërtimit.",
    category: "construction",
    style: "bold",
    status: "draft",
    ageMinutes: 60 * 3,
  });

  return [castello, nice, dental, beton];
}
