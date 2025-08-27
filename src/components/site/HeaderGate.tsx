"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function HeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Header />}
      {children}
    </>
  );
}
