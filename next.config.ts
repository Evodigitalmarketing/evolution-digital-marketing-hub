import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.STANDALONE ? { output: "standalone" as const } : {}),
};

export default nextConfig;
