"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  Building,
  Calendar,
  LogOut,
  Plus,
  List,
  MessageCircle,
  ClipboardClock,
  BookUser,
  Book,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { title } from "process";

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
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800">Villa Admin</h2>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors ${
              pathname === item.href ? "bg-gray-100 border-l-4 border-blue-500" : ""
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 w-64 p-6">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
          <LogOut className="h-5 w-5" />
          <span>Çıkış Yap</span>
        </Button>
      </div>
    </div>
  );
}
