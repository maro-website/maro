/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Old /tools/* URLs → new top-level tool routes (renamed for brevity).
    return [
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
