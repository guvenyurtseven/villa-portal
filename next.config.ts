import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // kategori kapakları
      },
      {
        protocol: "https",
        hostname: "natnhxcqtfzhrfqdqvrl.supabase.co", // Supabase storage (villa fotoğrafları)
      },
    ],
  },
  eslint: {
    // UYARI: ESLint hataları varken de build devam eder
    ignoreDuringBuilds: true,
  },
  typescript: {
    // UYARI: TS hataları varken de build devam eder
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
