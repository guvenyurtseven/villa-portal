// src/components/site/AvailabilityCalendar.tsx
"use client";

import { useMemo, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { tr } from "date-fns/locale";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BookingForm from "./BookingForm";
import { useRouter } from "next/navigation";
import { DialogDescription } from "@radix-ui/react-dialog";

// TL biçimleyici
const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

type Range = { from?: Date; to?: Date };
type Unavailable = { start: string; end: string; type: "reserved" | "blocked" };

export default function AvailabilityCalendar({
  weeklyPrice,
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
  const router = useRouter();
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

  // Bugünün başlangıcı (zaman bileşenlerini sıfırla)
  const today = startOfDay(new Date());

  // unavailable aralıklarını DayPicker ile uyumlu range'lere çevir
  const unavailableRanges = useMemo(
    () =>
      unavailable.map((u) => ({
        from: startOfDay(parseISO(u.start)),
        to: startOfDay(parseISO(u.end)),
        type: u.type,
      })),
    [unavailable],
  );

  // disabled listesi: geçmiş + tüm unavailable range'leri (DayPicker'ın disabled prop'una veriyoruz)
  const disabledMatchers = useMemo(() => {
    const ranges = unavailableRanges.map((r) => ({ from: r.from as Date, to: r.to as Date }));
    // { before: today } ile bugünden önceki günleri kilitliyoruz
    return [{ before: today }, ...ranges];
  }, [unavailableRanges, today]);

  // modifiers için ayrı array'ler (renklendirme)
  const reservedIntervals = useMemo(
    () =>
      unavailableRanges
        .filter((r) => r.type === "reserved")
        .map((r) => ({ from: r.from, to: r.to })),
    [unavailableRanges],
  );
  const blockedIntervals = useMemo(
    () =>
      unavailableRanges
        .filter((r) => r.type === "blocked")
        .map((r) => ({ from: r.from, to: r.to })),
    [unavailableRanges],
  );

  // Aralık çakışması kontrolü (inclusive)
  function rangeConflictsWithUnavailable(start: Date, end: Date) {
    const s = startOfDay(start);
    const e = startOfDay(end);
    return unavailableRanges.some((u) => {
      // çakışma: start <= u.to && end >= u.from
      return s <= (u.to as Date) && e >= (u.from as Date);
    });
  }

  function onSelect(next: DateRange | undefined) {
    // her seçmede range'ı göster (ilk tıklama görsel olarak kalmalı)
    setRange(next);
    setError(null);

    // Henüz ikinci tarih yoksa (sadece başlangıç seçildiyse), işlemi bekle
    if (!next?.from || !next?.to) {
      return;
    }

    // Normalize (sadece tarihe bak)
    const selFrom = startOfDay(next.from);
    const selTo = startOfDay(next.to);

    // Eğer kullanıcı aynı günü iki kere seçmişse (nights === 0), bunu "tamamlanmış aralık" olarak saymıyoruz.
    const nights = differenceInCalendarDays(selTo, selFrom);
    if (nights === 0) {
      // Sadece tek gün seçildi — görsel olarak bırak, fakat işlem yapma / hata gösterme
      // (kullanıcı muhtemelen bitişi seçmek isteyecek)
      return;
    }

    // 1) Seçilen aralık içinde geçmiş/güncel unavailable aralığı var mı? (tamamen boş olmalı)
    if (rangeConflictsWithUnavailable(selFrom, selTo)) {
      setError("Lütfen geçerli bir tarih aralığı seçiniz (dolu/kapalı günler arasına yazılamaz).");
      // seçimi temizle (kullanıcının yeniden seçmesini bekle)
      setRange(undefined);
      return;
    }

    // 2) Minimum gecelik kontrolu - yalnızca geçerli aralık için çalışsın
    if (nights < 7) {
      setError("Üzgünüz, bu tarih aralığı için minimum rezervasyon 7 gecedir!");
      setRange(undefined);
      return;
    }

    // Eğer buraya geldiyse seçim geçerli: fiyat hesapla ve özet popup'ını aç
    const perNight = weeklyPrice / 7;
    const subtotal = Math.round(perNight * nights);
    const discount = nights >= 14 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal - discount;
    const deposit = Math.round(total * 0.35);

    setQuote({
      from: selFrom,
      to: selTo,
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

      {/* Takvim konteynerı */}
      <div className="rounded-xl border p-3">
        <DayPicker
          locale={tr}
          mode="range"
          numberOfMonths={2} // yan yana 2 ay
          fromMonth={today} // takvimi bugünden başlat
          showOutsideDays
          selected={range as DateRange}
          onSelect={onSelect}
          disabled={disabledMatchers}
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
            <DialogTitle>Rezervasyon Özeti</DialogTitle>
            <DialogDescription>{villaName}</DialogDescription>
          </DialogHeader>

          {quote && (
            <div className="space-y-3">
              {/* ... fiyat satırları */}
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
                    const params = new URLSearchParams({
                      villaName,
                      villaImage,
                      from: quote.from.toISOString(),
                      to: quote.to.toISOString(),
                      nights: String(quote.nights),
                      total: String(quote.total),
                      deposit: String(quote.deposit),
                    });

                    router.push(`/booking?${params.toString()}`, { scroll: true });
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
      <span className={`${strong ? "font-semibold" : ""}`}>{value}</span>
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
