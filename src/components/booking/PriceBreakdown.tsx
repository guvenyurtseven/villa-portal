"use client";

import { useEffect, useState } from "react";

type Props = {
  villaId: string;
  fromISO: string; // Takvim seçiminden gelen ISO string (check-in)
  toISO: string; // Takvim seçiminden gelen ISO string (check-out)
};

type PriceResp = {
  nights: number;
  base_total: number;
  cleaning_fee: number;
  cleaning_fee_applied: boolean;
  short_stay: boolean;
  total: number;
  deposit: number;
};

export default function PriceBreakdown({ villaId, fromISO, toISO }: Props) {
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<PriceResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    async function run() {
      if (!villaId || !fromISO || !toISO) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/calculate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ villaId, from: fromISO, to: toISO }),
        });
        if (!res.ok) throw new Error("Hesaplama hatası");
        const data = (await res.json()) as PriceResp;
        if (!abort) setPrice(data);
      } catch (e: any) {
        if (!abort) setError(e?.message || "Hata");
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [villaId, fromISO, toISO]);

  if (loading) return <div className="text-sm">Hesaplanıyor…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!price) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " ₺";

  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>Gece x {price.nights}</span>
        <span>{fmt(price.base_total)}</span>
      </div>

      {price.cleaning_fee_applied && price.cleaning_fee > 0 && (
        <div className="flex justify-between">
          <span>Temizlik ücreti</span>
          <span>{fmt(price.cleaning_fee)}</span>
        </div>
      )}

      <div className="border-t my-1" />

      <div className="flex justify-between font-semibold">
        <span>Toplam</span>
        <span>{fmt(price.total)}</span>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Ön ödeme (%35)</span>
        <span>{fmt(price.deposit)}</span>
      </div>

      {price.short_stay && (
        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs">
          7 günden az tarih aralıkları için toplam ücrete <b>ek olarak temizlik ücreti</b> talep
          edilmektedir.
        </div>
      )}
    </div>
  );
}
