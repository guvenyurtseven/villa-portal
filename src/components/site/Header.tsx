"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, ChevronRight, Grid3X3, Home, Info, Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mobileNavItems = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/villas", label: "Villalar", icon: Building2 },
  { href: "/kategoriler", label: "Kategoriler", icon: Grid3X3 },
  { href: "/hakkimizda", label: "Hakkımızda", icon: Info },
] as const;

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
              <SheetTrigger
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white shadow-sm transition hover:border-orange-200 hover:text-orange-600 md:hidden"
                aria-label="Menüyü aç"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[20rem] max-w-[calc(100vw-2rem)] px-4">
                <SheetHeader className="border-b pb-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-black/10">
                      <Image
                        src="/logo-villa-dunyasi.svg"
                        alt="Villa Dünyası Logo"
                        fill
                        priority
                        className="object-cover"
                      />
                    </div>
                    <SheetTitle className="text-base font-semibold tracking-wide text-slate-900">
                      Villa Dünyası
                    </SheetTitle>
                  </div>
                </SheetHeader>

                <nav className="mt-5 grid gap-2">
                  {mobileNavItems.map(({ href, label, icon: Icon }) => (
                    <SheetClose asChild key={href}>
                      <Link
                        href={href}
                        className="group relative flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-10 text-sm font-medium text-slate-800 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.99]"
                      >
                        <Icon className="pointer-events-none absolute left-3 h-4 w-4 text-orange-500 transition group-hover:text-orange-600" />
                        <span className="truncate text-center">{label}</span>
                        <ChevronRight className="pointer-events-none absolute right-3 h-4 w-4 text-slate-300 transition group-hover:text-orange-500" />
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-5">
                  <SheetClose asChild>
                    <Link href="/hakkimizda" className="block">
                      <Button variant="primary" className="h-11 w-full gap-2">
                        <Phone className="h-4 w-4" />
                        Bize Ulaşın
                      </Button>
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
