import { MODULE_AVAILABILITY } from "@/lib/modules/availability";

// The application currently uses Albanian copy directly. Keep this experiment's
// copy together so it can migrate to a locale catalog without touching layout.
export const copy = {
  greeting: "Maro diçka sot",
  workspace: "Hapësira jote",
  workspaceError: "Hapësira nuk u ndryshua. Provo përsëri.",
  imazh: { name: "maroImazh", line: "Imagjino përtej\ntë zakonshmes.", action: "Krijo imazh", href: "/imazh" },
  logo: { name: "maroLogo", action: "Krijo identitet", href: "/marologo" },
  example: "Drejtim vizual · shembull",
  palette: "Provo një tjetër ngjyrë",
  continue: "Vazhdo aty ku e le.",
  history: "Krijimet e tua",
  ecosystem: "Ma shume se veq ni imazh:",
  presets: "Mos e nis nga zero.",
  browse: "Të gjitha presetet",
  usePreset: "Përdor presetin",
  presetError: "Preseti nuk mund të hapet tani. Provo përsëri.",
};

export const upcoming = [
  { id: "web", description: "Jepi idesë një adresë.", motif: "web" },
  { id: "audio", description: "Gjeje zërin tënd.", motif: "audio" },
  { id: "filma", description: "Vëre imagjinatën në lëvizje.", motif: "film" },
  { id: "marketing", description: "Ide që gjejnë njerëzit e duhur.", motif: "marketing" },
].map((item) => ({ ...item, ...MODULE_AVAILABILITY[item.id as "web" | "filma" | "audio" | "marketing"] }));

export const palettes = [
  { name: "Kobalt", ink: "#253fda", paper: "#e9e9f1", accent: "#d7ef79" },
  { name: "Pyje", ink: "#245341", paper: "#e8ece3", accent: "#f4c5a7" },
  { name: "Terrakotë", ink: "#a53d29", paper: "#f0e7df", accent: "#f4d984" },
];
