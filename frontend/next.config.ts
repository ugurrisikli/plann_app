import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Backend URL'yi server-side'da da güvenli tut
  env: {
    BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;
