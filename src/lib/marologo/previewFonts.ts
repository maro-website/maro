import {
  Inter,
  Sora,
  Source_Sans_3,
  Libre_Baskerville,
  Cormorant_Garamond,
  Bebas_Neue,
  Caveat,
  Syne,
  Manrope,
} from "next/font/google";

export const previewFontInter = Inter({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });
export const previewFontSora = Sora({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });
export const previewFontSourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });
export const previewFontLibre = Libre_Baskerville({ subsets: ["latin"], weight: ["700"], display: "swap" });
export const previewFontCormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["600"], display: "swap" });
export const previewFontBebas = Bebas_Neue({ subsets: ["latin"], weight: ["400"], display: "swap" });
export const previewFontCaveat = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });
export const previewFontSyne = Syne({ subsets: ["latin"], weight: ["700"], display: "swap" });
export const previewFontManrope = Manrope({ subsets: ["latin"], weight: ["600"], display: "swap" });

export const PREVIEW_FONT_CLASS: Record<string, string> = {
  Inter: previewFontInter.className,
  Sora: previewFontSora.className,
  "Source Sans 3": previewFontSourceSans.className,
  "Libre Baskerville": previewFontLibre.className,
  "Cormorant Garamond": previewFontCormorant.className,
  "Bebas Neue": previewFontBebas.className,
  Caveat: previewFontCaveat.className,
  Syne: previewFontSyne.className,
  Manrope: previewFontManrope.className,
};
