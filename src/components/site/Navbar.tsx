"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-md py-4 px-6 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold">
        Villa Dünyası
      </Link>
      <div className="space-x-6 hidden md:flex">
        <Link href="/villas">Villalar</Link>
        <Link href="/hakkimizda">Hakkımızda</Link>
        <Link href="/kategoriler">Kategoriler</Link>
      </div>
    </nav>
  );
}
