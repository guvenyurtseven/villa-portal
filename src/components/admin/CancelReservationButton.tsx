"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CancelReservationButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    const ok = window.confirm("Bu rezervasyon iptal edilecek. Emin misiniz?");
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "İptal sırasında hata oluştu");
      }
      router.refresh(); // sayfayı yenile
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="danger"
    >
      {loading ? "İptal ediliyor..." : "İptal Et"}
    </Button>
  );
}
