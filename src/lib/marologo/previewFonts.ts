import localFont from "next/font/local";

// Keep preview builds independent of Google Fonts responses and network access.
export const previewFontInter = localFont({ src: "./fonts/inter-latin.woff2", weight: "500 600", display: "swap" });
export const previewFontSora = localFont({ src: "./fonts/sora-latin.woff2", weight: "500 600", display: "swap" });
export const previewFontSourceSans = localFont({ src: "./fonts/sourcesans3-latin.woff2", weight: "500 600", display: "swap" });
export const previewFontLibre = localFont({ src: "./fonts/librebaskerville-latin.woff2", weight: "700", display: "swap" });
export const previewFontCormorant = localFont({ src: "./fonts/cormorantgaramond-latin.woff2", weight: "600", display: "swap" });
export const previewFontBebas = localFont({ src: "./fonts/bebasneue-latin.woff2", weight: "400", display: "swap" });
export const previewFontCaveat = localFont({ src: "./fonts/caveat-latin.woff2", weight: "600", display: "swap" });
export const previewFontSyne = localFont({ src: "./fonts/syne-latin.woff2", weight: "700", display: "swap" });
export const previewFontManrope = localFont({ src: "./fonts/manrope-latin.woff2", weight: "600", display: "swap" });

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
