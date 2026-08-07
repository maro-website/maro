import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { ThemeProvider } from "@/context/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { CookieBanner } from "@/components/legal/CookieBanner";

// Dark UI only — set meta theme-color before first paint.
const THEME_INIT = `(function(){try{localStorage.setItem('maro.theme','mshelt');document.documentElement.removeAttribute('data-theme');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#191919');}catch(e){}})();`;

export const metadata: Metadata = {
  title: "maro · AI Hub",
  description:
    "maro AI Hub: krijo website, logo dhe imazhe me AI. Përshkruaj çka do dhe maro e maron.",
  icons: { icon: "/brand/symbol.svg" },
};

export const viewport: Viewport = {
  themeColor: "#191919",
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="w-full overflow-x-clip bg-canvas text-ink antialiased">
        <ThemeProvider>
          <MaroProvider>
            <ToastProvider>
              {children}
              <CookieBanner />
            </ToastProvider>
          </MaroProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
