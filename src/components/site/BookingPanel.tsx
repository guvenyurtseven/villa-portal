"use client";

import { useState } from "react";
import AvailabilityCalendar, { ReservedRange, ValidRange } from "./AvailabilityCalendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BookingForm from "./BookingForm";

export default function BookingPanel({
  villaId,
  weeklyPrice,
  reservedRanges,
}: {
  villaId: string;
  weeklyPrice: number;
  reservedRanges: ReservedRange[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [range, setRange] = useState<ValidRange | null>(null);
  const minNights = 7;

  function handleValid(r: ValidRange) {
    setError(null);
    setRange(r);
    setSummaryOpen(true);
  }
  function handleInvalid(msg: string) {
    setRange(null);
    setSummaryOpen(false);
    setError(msg);
  }

  // hesaplama: haftalık
  const weeks = range ? Math.ceil(range.nights / 7) : 0;
  const total = weeks * weeklyPrice;
  const deposit = Math.round(total * 0.35);
  const remaining = total - deposit;

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-3">Müsaitlik & Fiyat</h3>

      <div className="rounded-xl border border-gray-200 p-3 bg-white">
        <AvailabilityCalendar
          reservedRanges={reservedRanges}
          minNights={minNights}
          onValidRange={handleValid}
          onInvalid={handleInvalid}
        />

        {/* Lejand */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm border border-gray-300 bg-white"></span> Müsait
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-gray-200 border border-gray-300"></span> Geçmiş
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-[#dbeafe]"></span> Dolu
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-[#ffedd5]"></span> Müsait (turuncu)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-black"></span> Seçili
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
        )}
      </div>

      {/* Özet / Form modalı */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-[640px]">
          {!range ? null : (
            <>
              <DialogHeader>
                <DialogTitle>Tarihler Müsait</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Giriş</div>
                    <div className="font-medium">{range.from.toLocaleDateString("tr-TR")}</div>
                  </div>
                  <div className="text-2xl">→</div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Çıkış</div>
                    <div className="font-medium">{range.to.toLocaleDateString("tr-TR")}</div>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-gray-50">
                  <Row label="Toplam gece" value={range.nights} />
                  <Row label="Hesaplanan hafta" value={Math.ceil(range.nights / 7)} />
                  <Row label="Haftalık fiyat" value={`₺${weeklyPrice.toLocaleString("tr-TR")}`} />
                  <Row label="Toplam" value={`₺${total.toLocaleString("tr-TR")}`} />
                  <Row label="Ön ödeme (≈%35)" value={`₺${deposit.toLocaleString("tr-TR")}`} />
                  <Row label="Kalan ödeme" value={`₺${remaining.toLocaleString("tr-TR")}`} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSummaryOpen(false)}>
                    Kapat
                  </Button>
                  <Button
                    onClick={() => {
                      /* form adımına geçiyoruz; modal açık kalıyor */
                    }}
                  >
                    Devam
                  </Button>
                </div>

                {/* Devam: form */}
                <div className="mt-2">
                  <BookingForm
                    villaId={villaId}
                    from={range.from}
                    to={range.to}
                    total={total}
                    onDone={() => {
                      setSummaryOpen(false);
                      setRange(null);
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
