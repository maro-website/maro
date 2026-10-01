import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { WorkspaceProvider } from "@/context/workspace";
import { ThemeProvider } from "@/context/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { MARO_LOGO } from "@/lib/design/maro-system";

import { THEME_INIT_SCRIPT } from "@/lib/security/headers";
import { LAUNCH_REQUEST_HEADER } from "@/lib/launch/config";

export const metadata: Metadata = {
  title: "maro · AI Hub",
  description:
    "maro AI Hub: krijo logo dhe imazhe me AI. Përshkruaj çka do dhe maro e maron.",
  icons: { icon: MARO_LOGO.symbol },
};

export const viewport: Viewport = {
  themeColor: "#111315",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const isLaunchRequest = requestHeaders.get(LAUNCH_REQUEST_HEADER) === "1";

  return (
    <html lang="sq" data-theme="mshelt" suppressHydrationWarning>
      {isLaunchRequest ? null : (
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>
      )}
      <body
        data-maro-ui={isLaunchRequest ? "launch" : "final"}
        className={
          isLaunchRequest
            ? "w-full overflow-x-clip bg-black text-white antialiased"
            : "w-full overflow-x-clip bg-canvas text-ink antialiased"
        }
      >
        {isLaunchRequest ? (
          children
        ) : (
          <MaroProvider>
            <ThemeProvider>
              <WorkspaceProvider>
                <ToastProvider>
                  {children}
                  <CookieBanner />
                </ToastProvider>
              </WorkspaceProvider>
            </ThemeProvider>
          </MaroProvider>
        )}
      </body>
    </html>
  );
}
