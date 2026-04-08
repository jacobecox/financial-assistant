import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles only what's needed — required for the Docker image
  // deployed as a Control Plane app workload.
  output: "standalone",
  // PWA headers for manifest
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

export default nextConfig;
