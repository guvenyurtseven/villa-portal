// src/components/admin/pending/PendingReservationActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PendingReservationActions({
  reservationId,
  villaId,
}: {
  reservationId: string;
  villaId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const approve = async () => {
    if (loading) return;
    setLoading("approve");
    try {
      const res = await fetch(`/api/admin/pending-reservations/${reservationId}/approve`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || res.statusText);
      }
      // Onaylandı → ilgili villanın takvimine git
      router.replace(`/admin/villas/${villaId}/calendar?approved=1`);
    } catch (e: any) {
      alert(`Onaylanamadı: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(null);
    }
  };

  const reject = async () => {
    if (loading) return;
    const ok = window.confirm(
      "Bu ön rezervasyon talebi kalıcı olarak silinecek. Devam edilsin mi?",
    );
    if (!ok) return;

    setLoading("reject");
    try {
      const res = await fetch(`/api/admin/pending-reservations/${reservationId}/reject`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || res.statusText);
      }
      router.replace(`/admin/reservations/pending?deleted=1`);
    } catch (e: any) {
      alert(`Silme başarısız: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={approve}
        disabled={loading !== null}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {loading === "approve" ? "Onaylanıyor…" : "Rezervasyonu Onayla"}
      </Button>
      <Button onClick={reject} variant="destructive" disabled={loading !== null}>
        {loading === "reject" ? "Siliniyor…" : "Rezervasyonu Reddet"}
      </Button>
    </div>
  );
}
