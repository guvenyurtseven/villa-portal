import type { Metadata } from "next";
import "./globals.css";
import HeaderGate from "@/components/site/HeaderGate";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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
