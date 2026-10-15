import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { WorkspaceProvider } from "@/context/workspace";
import { ThemeProvider } from "@/context/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { RateLimitNotice } from "@/components/app/RateLimitNotice";
import { PresencePulse } from "@/components/app/PresencePulse";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { metadataForPage, PAGE_PATH_HEADER } from "@/lib/siteMetadata";

import { THEME_INIT_SCRIPT } from "@/lib/security/headers";
import { LAUNCH_REQUEST_HEADER } from "@/lib/launch/config";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  return metadataForPage(h.get(LAUNCH_REQUEST_HEADER) === "1" ? "/coming-soon" : h.get(PAGE_PATH_HEADER) ?? "/");
}

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
          <script suppressHydrationWarning nonce={requestHeaders.get("x-nonce") ?? undefined} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
                  <PresencePulse />
                  <CookieBanner />
                  <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ""} nonce={requestHeaders.get("x-nonce") ?? undefined} />
                  <RateLimitNotice />
                </ToastProvider>
              </WorkspaceProvider>
            </ThemeProvider>
          </MaroProvider>
        )}
      </body>
    </html>
  );
}
