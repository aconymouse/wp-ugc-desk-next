import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/situs";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
