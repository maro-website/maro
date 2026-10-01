import type { CaseStudy, GenerationSetup, StudyTest } from "./types";

const root = "/case-studies/noma-coffee";
const setups: GenerationSetup[] = [
  { id: "chatgpt", provider: "ChatGPT", model: "High", brain: null, isMaro: false },
  { id: "gemini", provider: "Gemini", model: "Nano Banana Pro", brain: null, isMaro: false },
  { id: "maro-off", provider: "maro.al v1", model: null, brain: "OFF", isMaro: true },
  { id: "maro-on", provider: "maro.al v1", model: null, brain: "ON", isMaro: true },
];

// Original filenames, measured dimensions, and the PDF's left-to-right mapping.
const renderFiles = [
  { setupId: "chatgpt", suffix: "chatgpt.png", width: 1122, height: 1402 },
  { setupId: "gemini", suffix: "nanobananapro.jpg", width: 1686, height: 2528 },
  { setupId: "maro-off", suffix: "maro-marobrainoff.png", width: 1024, height: 1536 },
  { setupId: "maro-on", suffix: "maro-marobrainon.png", width: 1024, height: 1536 },
];

const briefs = [
  {
    number: "01", title: "Product Hero",
    description: "Produkti në qendër. Katër interpretime të një brief-i reklamues.",
    prompt: "Create a premium advertising image for NOMA Cold Brew.\n\nMake the product the hero of the composition and create a visually striking campaign image suitable for social media.\n\nNo text.",
  },
  {
    number: "02", title: "Lifestyle",
    description: "I njëjti produkt, brenda ritmit të një dite kreative.",
    prompt: "Create a lifestyle campaign image for NOMA Cold Brew showing the product naturally being used during a busy creative workday.\n\nIt should feel authentic rather than staged.\n\nNo text.",
  },
  {
    number: "03", title: "Creative Campaign",
    description: "Një kërkesë për energji, kreativitet dhe një risk vizual.",
    prompt: "Create an unexpected advertising image for NOMA Cold Brew.\n\nThe concept should communicate energy and creativity without using obvious coffee advertising clichés.\n\nTake a creative risk.\n\nNo text.",
  },
];

const tests: StudyTest[] = briefs.map((brief) => ({
  ...brief,
  id: `test-${brief.number}`,
  renders: renderFiles.map(({ suffix, ...file }) => ({
    ...file,
    src: `${root}/renders/test-${brief.number}/test${brief.number}-${suffix}`,
    alt: `NOMA Coffee · ${brief.title} · ${setups.find((setup) => setup.id === file.setupId)!.provider} · ${file.setupId === "maro-on" ? "maroBrain ON" : file.setupId === "maro-off" ? "maroBrain OFF" : file.setupId === "gemini" ? "Nano Banana Pro" : "High"}`,
  })),
}));

export const nomaCoffee: CaseStudy = {
  id: "noma-coffee", slug: "noma-coffee", number: "01", title: "NOMA Coffee", brand: "NOMA Coffee",
  module: "maroImazh", category: "Food & Beverage", type: "Brand Advertising / Image Generation",
  description: "Një brand. Tre brief-e. Katër konfigurime. I njëjti produkt në çdo test.",
  date: null, // No experiment date was supplied; do not infer one from file timestamps.
  headline: ["Një produkt.", "Tre brief-e.", "Dymbëdhjetë rezultate."],
  introduction: "I dhamë katër sistemeve të njëjtin produkt dhe të njëjtat kërkesa. Asnjë prompt nuk u optimizua për një model të caktuar.",
  cover: tests[0].renders[0],
  inputs: [{ label: "NOMA Cold Brew", src: `${root}/input/NOMA_PACKAGING_ATTACHMENT.png`, alt: "NOMA Cold Brew — attachment-i origjinal i produktit", width: 1024, height: 1536 }],
  setups, tests,
  evidence: [{ title: "Eksperimenti origjinal · Case Study 01", src: `${root}/evidence/maro-casestudy-01.pdf`, type: "pdf" }],
  methodology: {
    statement: "Çdo sistem mori të njëjtin prompt dhe të njëjtin imazh të produktit. Gjenerimet janë ruajtur si rezultate të para, pa përzgjedhur vetëm versionet më të mira.",
    provenance: "Promptet dhe lidhja e çdo rezultati me konfigurimin janë verifikuar kundrejt PDF-së origjinale. Deklarimi i rezultateve të para dhe përmbledhja e maroBrain janë dhënë nga autori i eksperimentit.",
    limitations: "Ky është një eksperiment vizual me një brand dhe tre brief-e, jo një benchmark i përgjithshëm. Data, seed-et, parametrat e tjerë dhe modeli bazë i maro.al v1 nuk janë dokumentuar në materialin e dhënë.",
  },
  maroBrain: [
    { label: "BRAND", title: "NOMA Coffee", description: "Modern cold brew brand for the creative urban generation." },
    { label: "TARGET", title: "20–38", description: "Creative professionals, designers, developers, freelancers and students." },
    { label: "POSITIONING", title: "Premium urban cold brew.", description: "Design-driven, contemporary and approachable." },
    { label: "VOICE", title: "Modern. Confident.", description: "Short. Playful." },
    { label: "AVOID", title: "Pa klishetë e kafesë.", description: "Traditional coffee clichés · Generic luxury · Stock-photo feeling · AI-looking compositions" },
  ],
  cta: { label: "Provo maroImazh", href: "/imazh" },
};
