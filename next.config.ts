import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      {
        // Prevent any load balancer or CDN from buffering the AI stream
        source: "/api/chat",
        headers: [
          { key: "X-Accel-Buffering", value: "no" },
          { key: "Cache-Control", value: "no-cache, no-transform" },
          { key: "Connection", value: "keep-alive" },
        ],
      },
    ];
  },
};

export default nextConfig;
