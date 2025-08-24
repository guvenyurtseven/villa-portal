"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-lg bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition disabled:opacity-60"
    >
      {loading ? "İptal ediliyor..." : "İptal Et"}
    </button>
  );
}
