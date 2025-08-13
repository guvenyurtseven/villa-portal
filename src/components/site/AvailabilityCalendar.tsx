// src/components/site/AvailabilityCalendar.tsx
"use client";

import { useMemo, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { tr } from "date-fns/locale";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BookingForm from "./BookingForm";

// Yardımcı: TL biçimleyici
const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

type Range = { from?: Date; to?: Date };
type Unavailable = { start: string; end: string; type: "reserved" | "blocked" };

export default function AvailabilityCalendar({
  weeklyPrice, // numeric
  unavailable,
  villaName,
  villaImage,
}: {
  weeklyPrice: number;
  unavailable: Unavailable[];
  villaName: string;
  villaImage: string;
}) {
  const [range, setRange] = useState<Range>();
  const [error, setError] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Kullanıcı seçimi sonucu hesaplanan ücret
  const [quote, setQuote] = useState<{
    from: Date;
    to: Date;
    nights: number;
    perNight: number;
    subtotal: number;
    discount: number;
    total: number;
    deposit: number;
  } | null>(null);

  // DayPicker için "disabled" ve renklendirme aralıkları
  const disabledIntervals = useMemo(() => {
    return unavailable.map((u) => ({ from: parseISO(u.start), to: parseISO(u.end) }));
  }, [unavailable]);

  const reservedIntervals = useMemo(() => {
    return unavailable
      .filter((u) => u.type === "reserved")
      .map((u) => ({ from: parseISO(u.start), to: parseISO(u.end) }));
  }, [unavailable]);

  const blockedIntervals = useMemo(() => {
    return unavailable
      .filter((u) => u.type === "blocked")
      .map((u) => ({ from: parseISO(u.start), to: parseISO(u.end) }));
  }, [unavailable]);

  function onSelect(next: DateRange | undefined) {
    setRange(next);
    setError(null);

    if (!next?.from || !next?.to) return;

    const nights = differenceInCalendarDays(next.to, next.from);
    if (nights < 7) {
      setQuote(null);
      setQuoteOpen(false);
      setError("Üzgünüz, bu tarih aralığı için minimum rezervasyon 7 gecedir!");
      return;
    }

    // Basit hesap: haftalık fiyat / 7 * gece sayısı
    const perNight = weeklyPrice / 7;
    const subtotal = Math.round(perNight * nights);
    const discount = nights >= 14 ? Math.round(subtotal * 0.05) : 0; // örnek: 14+ gece %5
    const total = subtotal - discount;
    const deposit = Math.round(total * 0.35); // örnek: %35 ön ödeme

    setQuote({
      from: next.from,
      to: next.to,
      nights,
      perNight,
      subtotal,
      discount,
      total,
      deposit,
    });
    setQuoteOpen(true);
  }

  return (
    <div className="mt-8">
      {/* Hata bandı */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700">
          {error}
        </div>
      )}

      {/* Takvim */}
      <div className="rounded-xl border p-3">
        <DayPicker
          locale={tr}
          mode="range"
          numberOfMonths={2}
          showOutsideDays
          selected={range as DateRange}
          onSelect={onSelect}
          disabled={disabledIntervals}
          modifiers={{
            reserved: reservedIntervals,
            blocked: blockedIntervals,
          }}
          modifiersClassNames={{
            reserved: "bg-orange-500 text-white hover:bg-orange-600",
            blocked: "bg-gray-300 text-gray-500 line-through",
          }}
          className="!text-sm"
        />
        {/* Lejant */}
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <Legend colorClass="bg-white border" label="Müsait" />
          <Legend colorClass="bg-gray-300" label="Dolu" />
          <Legend colorClass="bg-orange-500" label="Rezerve" />
        </div>
      </div>

      {/* Fiyat özet pop-up */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{villaName} – Rezervasyon Özeti</DialogTitle>
          </DialogHeader>

          {quote && (
            <div className="space-y-3">
              <Row label="Gece Sayısı" value={`${quote.nights} gece`} />
              <Row label="Gecelik" value={tl.format(quote.perNight)} />
              <Row label="Ara Toplam" value={tl.format(quote.subtotal)} />
              {quote.discount > 0 && (
                <Row label="Kiralama İndirimi" value={`- ${tl.format(quote.discount)}`} />
              )}
              <div className="mt-3 border-t pt-3">
                <Row strong label="Toplam" value={tl.format(quote.total)} />
                <Row label="Ön Ödeme" value={tl.format(quote.deposit)} />
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowForm(true);
                    setQuoteOpen(false);
                  }}
                >
                  Devam
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rezervasyon formu */}
      {showForm && quote && (
        <div className="mt-6">
          <BookingForm
            villaName={villaName}
            villaImage={villaImage}
            from={quote.from}
            to={quote.to}
            nights={quote.nights}
            total={quote.total}
            deposit={quote.deposit}
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={`text-gray-600 ${strong ? "font-semibold text-gray-800" : ""}`}>
        {label}
      </span>
      <span className={` ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-5 rounded border ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}
