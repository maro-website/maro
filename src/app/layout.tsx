import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { ThemeProvider } from "@/context/theme";
import { ToastProvider } from "@/components/ui/Toast";

// Set the theme before first paint to avoid a flash of the wrong theme.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('maro.theme')||'mono';if(t!=='light')document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','mono');}})();`;

export const metadata: Metadata = {
  title: "maro · AI Hub",
  description:
    "maro AI Hub: krijo website, logo dhe imazhe me AI. Përshkruaj çka do dhe maro e maron.",
  icons: { icon: "/brand/symbol.svg" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <ThemeProvider>
          <MaroProvider>
            <ToastProvider>{children}</ToastProvider>
          </MaroProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
