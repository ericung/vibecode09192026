import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't expose the framework header; minor hardening per production checklist.
  poweredByHeader: false,
  turbopack: {
    // Pin the project root so builds don't warn about lockfiles outside the repo.
    root: process.cwd(),
  },
};

export default nextConfig;
