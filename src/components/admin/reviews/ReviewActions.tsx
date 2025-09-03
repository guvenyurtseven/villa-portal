"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ReviewActions({ reviewId }: { reviewId: string }) {
  const [loading, setLoading] = useState<"approve" | "delete" | null>(null);
  const router = useRouter();

  const approve = async () => {
    if (loading) return;
    setLoading("approve");
    const res = await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setLoading(null);
    if (!res.ok) {
      alert("Onay başarısız");
      return;
    }
    router.replace("/admin/reviews");
    router.refresh();
  };

  const remove = async () => {
    if (loading) return;
    const ok = window.confirm("Yorumu silmek istediğinize emin misiniz?");
    if (!ok) return;

    setLoading("delete");
    const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
    setLoading(null);
    if (!res.ok) {
      alert("Silme başarısız");
      return;
    }
    router.replace("/admin/reviews");
    router.refresh();
  };

  return (
    <>
      <Button onClick={approve} disabled={loading !== null}>
        {loading === "approve" ? "Onaylanıyor..." : "Yorumu Onayla"}
      </Button>
      <Button onClick={remove} variant="destructive" disabled={loading !== null}>
        {loading === "delete" ? "Siliniyor..." : "Yorumu Sil"}
      </Button>
    </>
  );
}
