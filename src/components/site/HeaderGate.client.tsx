"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";

/**
 * Client tarafında pathname'e bakıp Header'ı gösterir/gizler.
 * - /admin ve /auth altında header gizlenir
 */
export default function HeaderGateClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname?.startsWith("/admin") || pathname?.startsWith("/auth") || false;

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}
