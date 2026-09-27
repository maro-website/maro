import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { HubLab } from "@/components/hub-lab/HubLab";

export const metadata: Metadata = {
  title: "maro HUB / Laboratori kreativ",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f9f9f9", width: "device-width", initialScale: 1,
  maximumScale: 5, userScalable: true,
};

/** Local experiment only. The production HUB and its routes are untouched. */
export default function HubLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <HubLab />;
}
