import type { Metadata, Viewport } from "next";
import { ComingSoonExperience } from "@/components/launch/ComingSoonExperience";
import { metadataForPage } from "@/lib/siteMetadata";

export const metadata: Metadata = {
  ...metadataForPage("/coming-soon"),
  robots: { index: false, follow: false, nocache: true },
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
