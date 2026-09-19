import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { HubVision } from "@/components/hub-vision/HubVision";

export const metadata: Metadata = {
  title: "maro · Studio kreativ",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#f9f9f9", width: "device-width", initialScale: 1,
  maximumScale: 5, userScalable: true,
};

export default function HubVisionPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <HubVision />;
}
