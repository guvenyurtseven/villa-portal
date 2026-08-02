"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Anasayfa">
            <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-black/10">
              <Image
                src="/logo-villa-dunyasi.svg"
                alt="Villa Dünyası Logo"
                fill
                priority
                className="object-cover"
              />
            </div>
            <span className="hidden text-sm font-semibold tracking-wide text-slate-900 sm:inline">
              Villa Dünyası
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/" className="transition-colors hover:text-orange-600">
              Ana Sayfa
            </Link>
            <Link href="/villas" className="transition-colors hover:text-orange-600">
              Villalar
            </Link>
            <Link href="/kategoriler" className="transition-colors hover:text-orange-600">
              Kategoriler
            </Link>
            <Link href="/hakkimizda" className="transition-colors hover:text-orange-600">
              Hakkımızda
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <Link href="/hakkimizda">
                <Button variant="primary">Bize Ulaşın</Button>
              </Link>
            </div>

            <Sheet>
              <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md border md:hidden">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid gap-3">
                  <Link href="/" className="border-b py-2">
                    Ana Sayfa
                  </Link>
                  <Link href="/villas" className="border-b py-2">
                    Villalar
                  </Link>
                  <Link href="/kategoriler" className="border-b py-2">
                    Kategoriler
                  </Link>
                  <Link href="/hakkimizda" className="border-b py-2">
                    Hakkımızda
                  </Link>
                  <Link href="/hakkimizda" className="py-2">
                    <Button variant="primary" className="w-full">
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
