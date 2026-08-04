import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MaroProvider } from "@/context/store";
import { ThemeProvider } from "@/context/theme";
import { ToastProvider } from "@/components/ui/Toast";

// Set the theme before first paint to avoid a flash of the wrong theme.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('maro.theme')||'qelt';if(t==='mono')t='mshelt';if(t==='light'||t==='dark')t='qelt';if(t!=='qelt'&&t!=='mshelt')t='qelt';document.documentElement.setAttribute('data-theme',t);var c=t==='mshelt'?'#191919':'#d0e6fd';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c);}catch(e){document.documentElement.setAttribute('data-theme','qelt');}})();`;

export const metadata: Metadata = {
  title: "maro · AI Hub",
  description:
    "maro AI Hub: krijo website, logo dhe imazhe me AI. Përshkruaj çka do dhe maro e maron.",
  icons: { icon: "/brand/symbol.svg" },
  other: {
    "verify-paysera": "a55fe77b2b44938064f4cc9e74c40792",
  },
};

export const viewport: Viewport = {
  themeColor: "#d0e6fd",
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
        {/* Paysera domain verification — remove once confirmed in Paysera dashboard */}
        <meta name="verify-paysera" content="a55fe77b2b44938064f4cc9e74c40792" />
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
