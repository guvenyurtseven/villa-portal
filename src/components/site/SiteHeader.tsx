"use client";

import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40"
      style={{ backgroundColor: "#56DFCF" }} // marka rengi
    >
      <div className="mx-auto flex h-32 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo + Brand */}
        <Link href="/" className="flex items-center gap-4 shrink-0" aria-label="Anasayfa">
          <div className="relative h-12 w-12 overflow-hidden rounded-md ring-1 ring-black/10">
            <Image src="/logo.svg" alt="Villa Portal" fill priority className="object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
              Villa Portal
            </div>
            <div className="text-[12px] sm:text-sm text-slate-800">
              Tatiliniz İçin Mükemmel Villalar
            </div>
          </div>
        </Link>

        {/* Sağ taraf: ileride menü/CTA için yer tutucu */}
        <nav className="hidden sm:flex items-center gap-3 text-sm text-slate-800">
          {/* Örn: <Link href="/iletisim" className="hover:underline">İletişim</Link> */}
        </nav>
      </div>
    </header>
  );
}
