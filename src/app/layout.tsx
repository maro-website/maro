import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Maro — Trego çka të duhet. Maro e maron.",
  description:
    "Maro është platforma me AI që e kthen përshkrimin e biznesit tënd në një website të gatshëm. Trego çka të duhet, Maro e maron.",
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
