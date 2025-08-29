// src/components/site/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Sol: Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Anasayfa">
            {/* Kendi logonu buraya koy */}
            {/* <Image src="/logo.svg" alt="Site Logosu" width={120} height={32} priority /> */}
            <div className="w-28 h-10 rounded-md bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              LOGO
            </div>
          </Link>

          {/* Orta: Desktop navigasyon */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-orange-600 transition-colors">
              Ana Sayfa
            </Link>
            <Link href="/villas" className="hover:text-orange-600 transition-colors">
              Villalar
            </Link>
            <Link href="/categories" className="hover:text-orange-600 transition-colors">
              Kategoriler
            </Link>
            <Link href="/about" className="hover:text-orange-600 transition-colors">
              Hakkımızda
            </Link>
          </nav>

          {/* Sağ: CTA + Mobil menü */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <Link href="/contact">
                <Button className="bg-orange-500 hover:bg-orange-600">Bize Ulaşın</Button>
              </Link>
            </div>

            {/* Mobil menü */}
            <Sheet>
              <SheetTrigger className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menü</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid gap-3">
                  <Link href="/" className="py-2 border-b">
                    Ana Sayfa
                  </Link>
                  <Link href="/villas" className="py-2 border-b">
                    Villalar
                  </Link>
                  <Link href="/categories" className="py-2 border-b">
                    Kategoriler
                  </Link>
                  <Link href="/about" className="py-2 border-b">
                    Hakkımızda
                  </Link>
                  <Link href="/contact" className="py-2">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600">
                      Bize Ulaşın
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
