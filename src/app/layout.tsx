import type { Metadata } from "next";
import "./globals.css";
import HeaderGate from "@/components/site/HeaderGate";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico?v=2026-08-02-villa-dunyasi", sizes: "any" },
      { url: "/icon.svg?v=2026-08-02-villa-dunyasi", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/favicon.ico?v=2026-08-02-villa-dunyasi" }],
    apple: [
      {
        url: "/apple-icon.png?v=2026-08-02-villa-dunyasi",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  title: "Villa Dünyası",
  description: "Villa kiralama portalı",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {/* Header göster/gizle mantığını server sarmalayıcı üzerinden client'a aktarıyoruz */}
        <HeaderGate>{children}</HeaderGate>
      </body>
    </html>
  );
}
