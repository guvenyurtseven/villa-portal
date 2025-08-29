import type { Metadata } from "next";
import "./globals.css";
import HeaderGate from "@/components/site/HeaderGate";

export const metadata: Metadata = {
  title: "Villa Portal",
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
