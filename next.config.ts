
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Allow production builds to complete despite ESLint errors.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow production builds to complete despite TypeScript errors.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;