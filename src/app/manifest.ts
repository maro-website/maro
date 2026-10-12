import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/siteMetadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "maro.al", short_name: "maro", description: SITE_DESCRIPTION, lang: "sq",
    start_url: "/", scope: "/", display: "standalone", background_color: "#0f0f0f", theme_color: "#111315",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
