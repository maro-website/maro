/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/credits", destination: "/pricing", permanent: true },
      { source: "/tools/website", destination: "/web", permanent: true },
      { source: "/tools/logo", destination: "/logo", permanent: true },
      { source: "/tools/reklama", destination: "/imazh", permanent: true },
      { source: "/tools/zo", destination: "/zo", permanent: true },
      { source: "/tools/filma", destination: "/filma", permanent: true },
      { source: "/tools/prompte", destination: "/prompts", permanent: true },
      { source: "/tools", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
