"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookUser,
  Building,
  Calendar,
  ClipboardClock,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: Home,
  },
  {
    title: "Villalar",
    href: "/admin/villas",
    icon: Building,
  },
  {
    title: "Yeni Villa Ekle",
    href: "/admin/villas/new",
    icon: Plus,
  },
  {
    title: "Rezervasyonlar",
    href: "/admin/reservations",
    icon: Calendar,
  },
  {
    title: "Yorumları Yönet",
    href: "/admin/reviews",
    icon: MessageCircle,
  },
  {
    title: "Bekleyen Rezervasyonlar",
    href: "/admin/reservations/pending",
    icon: ClipboardClock,
  },
  {
    title: "Villa Sahipleri",
    href: "/admin/owners",
    icon: BookUser,
  },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLinks({
  pathname,
  mobile = false,
}: {
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <nav className={mobile ? "grid gap-2" : "mt-6 grid gap-1 px-3"}>
      {menuItems.map(({ href, title, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        const linkClass = mobile
          ? `group flex h-12 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition ${
              active
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50"
            }`
          : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-orange-50 text-orange-700"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"
            }`;

        const content = (
          <>
            <Icon className={`h-5 w-5 shrink-0 ${active ? "text-orange-600" : ""}`} />
            <span className="min-w-0 truncate">{title}</span>
          </>
        );

        if (mobile) {
          return (
            <SheetClose asChild key={href}>
              <Link href={href} className={linkClass}>
                {content}
              </Link>
            </SheetClose>
          );
        }

        return (
          <Link key={href} href={href} className={linkClass}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm md:hidden">
        <div>
          <div className="text-sm font-semibold text-slate-900">Villa Admin</div>
          <div className="text-xs text-slate-500">Yönetim Paneli</div>
        </div>

        <Sheet>
          <SheetTrigger
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white shadow-sm transition hover:border-orange-200 hover:text-orange-600"
            aria-label="Admin menüsünü aç"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[20rem] max-w-[calc(100vw-2rem)] px-4">
            <SheetHeader className="border-b pb-4 text-left">
              <SheetTitle className="text-base font-semibold text-slate-900">
                Villa Admin
              </SheetTitle>
              <p className="text-sm text-slate-500">Yönetim bağlantıları</p>
            </SheetHeader>

            <div className="mt-5">
              <AdminNavLinks pathname={pathname} mobile />
            </div>

            <div className="mt-auto border-t pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-700"
                onClick={() => signOut({ callbackUrl: "/admin-login" })}
              >
                <LogOut className="h-5 w-5" />
                <span>Çıkış Yap</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-white shadow-lg md:flex">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800">Villa Admin</h2>
          <p className="mt-1 text-xs text-gray-500">Yönetim Paneli</p>
        </div>

        <AdminNavLinks pathname={pathname} />

        <div className="mt-auto p-6">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => signOut({ callbackUrl: "/admin-login" })}
          >
            <LogOut className="h-5 w-5" />
            <span>Çıkış Yap</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
