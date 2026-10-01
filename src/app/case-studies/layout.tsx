import type { Viewport } from "next";
import { AppShell } from "@/components/app/AppShell";

export const viewport: Viewport = { themeColor: "#0c0c0c", width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true };

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return <div data-maro-case-studies><AppShell hideFooter>{children}</AppShell></div>;
}
