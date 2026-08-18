/** @type {import('next').NextConfig} */
import { buildSecurityHeaders } from "./security-headers.mjs";

const isProduction = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const baseHeaders = buildSecurityHeaders({ supabaseUrl, isProduction });
const noStoreHeaders = buildSecurityHeaders({
  supabaseUrl,
  isProduction,
  cacheControl: "no-store",
});

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: baseHeaders },
      { source: "/admin/:path*", headers: noStoreHeaders },
      { source: "/account/:path*", headers: noStoreHeaders },
      { source: "/sign-in", headers: noStoreHeaders },
      { source: "/sign-up", headers: noStoreHeaders },
      { source: "/checkout/:path*", headers: noStoreHeaders },
      { source: "/order/:path*", headers: noStoreHeaders },
      { source: "/pay/:path*", headers: noStoreHeaders },
      { source: "/projects/:path*", headers: noStoreHeaders },
      { source: "/api/:path*", headers: noStoreHeaders },
    ];
  },
  async redirects() {
    return [
      { source: "/credits", destination: "/pricing", permanent: true },
      { source: "/tools/website", destination: "/web", permanent: true },
      { source: "/tools/logo", destination: "/marologo", permanent: true },
      { source: "/brand", destination: "/marologo", permanent: true },
      { source: "/tools/reklama", destination: "/imazh", permanent: true },
      { source: "/tools/zo", destination: "/audio", permanent: true },
      { source: "/logo", destination: "/marologo", permanent: true },
      { source: "/zo", destination: "/audio", permanent: true },
      { source: "/tools/filma", destination: "/filma", permanent: true },
      { source: "/tools/prompte", destination: "/prompts", permanent: true },
      { source: "/tools", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
