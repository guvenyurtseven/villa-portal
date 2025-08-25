"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  villaId: string;
  villaName?: string | null;
};

export default function DeleteVillaButton({ villaId, villaName }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (loading) return;

    const ok = window.confirm(
      `"${villaName ?? "Bu villa"}" kalıcı olarak silinecek.\n` +
        `İlgili tüm rezervasyonlar, bloklu tarihler ve fotoğraflar da kaldırılacak.\n` +
        `Bu işlem geri alınamaz. Emin misiniz?`,
    );
    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/admin/villas/${villaId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(`Silme başarısız: ${body.error || res.statusText}`);
      setLoading(false);
      return;
    }

    router.replace("/admin/villas?deleted=1");
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      aria-label="villayi-sil"
      className="px-3 py-2 rounded-lg border border-red-500 bg-red-500 text-white font-semibold disabled:opacity-60"
    >
      {loading ? "Siliniyor…" : "Villayı Sil"}
    </button>
  );
}
