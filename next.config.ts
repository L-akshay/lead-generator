import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['got-scraping', '@react-pdf/renderer'],
};

export default nextConfig;
