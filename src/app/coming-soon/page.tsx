import type { Metadata, Viewport } from "next";
import { ComingSoonExperience } from "@/components/launch/ComingSoonExperience";

export const metadata: Metadata = {
  title: "maro. Po MAROhet.",
  description: "Diçka e re po marohet.",
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "maro. Po MAROhet.",
    description: "Diçka e re po marohet.",
    type: "website",
    siteName: "maro",
  },
};

export const viewport: Viewport = {
  themeColor: "#f9f9f9",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function ComingSoonPage() {
  return <ComingSoonExperience />;
}
