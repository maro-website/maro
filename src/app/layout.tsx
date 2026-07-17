import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "MARO Beta Version — Website me AI",
  description:
    "MARO Beta Version — përshkruaj website-in që do dhe Maro e maron me AI (Claude Opus 4.8).",
  icons: { icon: "/brand/symbol.svg" },
};

export const viewport: Viewport = {
  themeColor: "#5a28e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sq">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <MaroProvider>
          <ToastProvider>{children}</ToastProvider>
        </MaroProvider>
      </body>
    </html>
  );
}
