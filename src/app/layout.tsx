import type { Metadata } from "next";
import "./globals.css";
import "react-day-picker/dist/style.css";

export const metadata: Metadata = {
  title: "Villa Portal",
  description: "Villa kiralama ve yönetim platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-white text-black">{children}</body>
    </html>
  );
}
