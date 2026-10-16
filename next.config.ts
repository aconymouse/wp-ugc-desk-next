import type { NextConfig } from "next";

const CMS = process.env.NEXT_PUBLIC_CMS_URL;

const nextConfig: NextConfig = {
  trailingSlash: true,
  serverExternalPackages: ["web-push"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      ...(CMS ? [{ protocol: "https" as const, hostname: new URL(CMS).hostname }] : []),
    ],
  },
};

export default nextConfig;
