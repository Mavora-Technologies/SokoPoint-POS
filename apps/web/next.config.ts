import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { 
    unoptimized: true 
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;