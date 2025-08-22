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
};

export default nextConfig;
