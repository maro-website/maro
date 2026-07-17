import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Maro · AI Hub",
  description:
    "Maro AI Hub: krijo website, logo dhe reklama me AI. Përshkruaj çka do dhe Maro e maron.",
  icons: { icon: "/brand/symbol.svg" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  // Prevent iOS auto-zoom when focusing form fields.
  maximumScale: 1,
  userScalable: false,
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
