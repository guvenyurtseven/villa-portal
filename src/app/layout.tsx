import type { Metadata } from "next";
import "./globals.css";
import "react-day-picker/dist/style.css";
import HeaderGate from "@/components/site/HeaderGate";

export const metadata: Metadata = {
  title: "Villa Portal",
  description: "Villa kiralama ve yönetim platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-white text-black">
        <HeaderGate>{children}</HeaderGate>
      </body>
    </html>
  );
}
