// src/components/site/FlashThanks.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

export default function FlashThanks() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const shouldShow = sp.get("pre") === "1";
  const [visible, setVisible] = useState(shouldShow);

  // İlk renderdan sonra URL’den ?pre=1’i sil
  useEffect(() => {
    if (!shouldShow) return;
    const params = new URLSearchParams(Array.from(sp.entries()));
    params.delete("pre");
    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [shouldShow, sp, pathname, router]);

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-3 relative">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute right-2 top-2 rounded p-1 hover:bg-green-100"
        onClick={() => setVisible(false)}
      >
        <X className="h-4 w-4" />
      </button>
      <p className="font-medium">Talebiniz alındı.</p>
      <p className="text-sm">En kısa sürede sizinle iletişime geçeceğiz.</p>
    </div>
  );
}
