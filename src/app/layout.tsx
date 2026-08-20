import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { WorkspaceProvider } from "@/context/workspace";
import { ThemeProvider } from "@/context/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { MARO_LOGO } from "@/lib/design/maro-system";

import { THEME_INIT_SCRIPT } from "@/lib/security/headers";

export const metadata: Metadata = {
  title: "maro · AI Hub",
  description:
    "maro AI Hub: krijo website, logo dhe imazhe me AI. Përshkruaj çka do dhe maro e maron.",
  icons: { icon: MARO_LOGO.symbol },
};

export const viewport: Viewport = {
  themeColor: "#F9F9F9",
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="w-full overflow-x-clip bg-canvas text-ink antialiased">
        <ThemeProvider>
          <MaroProvider>
            <WorkspaceProvider>
              <ToastProvider>
                {children}
                <CookieBanner />
              </ToastProvider>
            </WorkspaceProvider>
          </MaroProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
