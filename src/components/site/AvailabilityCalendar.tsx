"use client";

import { useMemo, useState, useEffect } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { tr } from "date-fns/locale";
import {
  differenceInCalendarDays,
  parseISO,
  startOfDay,
  addDays,
  format,
  isWithinInterval,
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BookingForm from "./BookingForm";
import { useRouter } from "next/navigation";
import { DialogDescription } from "@radix-ui/react-dialog";

const LIGHT_ORANGE = "rgba(251, 146, 60, 0.28)"; // #fb923c ~%28 opaklık

// TL biçimleyici
const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

type Range = { from?: Date; to?: Date };
type Unavailable = { start: string; end: string; type: "reserved" | "blocked" };
type PricingPeriod = {
  id: string;
  villa_id: string;
  start_date: string;
  end_date: string;
  nightly_price: number;
};

interface AvailabilityCalendarProps {
  weeklyPrice?: number;
  unavailable: Unavailable[];
  villaName: string;
  villaImage: string;
  villaId?: string;
  pricingPeriods?: PricingPeriod[];
  opportunities?: Array<{
    startDate: string;
    endDate: string;
    nights: number;
    originalPrice: number;
    discountedPrice: number;
    discountPercentage: number;
  }>;
}
export default function AvailabilityCalendar({
  unavailable,
  villaName,
  villaImage,
  villaId,
  pricingPeriods = [],
  opportunities = [], // Yeni prop
}: AvailabilityCalendarProps) {
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
    priceBreakdown?: Array<{ date: string; price: number }>;
  } | null>(null);

  // Bugünün başlangıcı (zaman bileşenlerini sıfırla)
  const today = startOfDay(new Date());

  // Belirli bir tarih için fiyatı hesapla
  function getPriceForDate(date: Date): number | null {
    const dateStr = format(date, "yyyy-MM-dd");

    // Özel fiyat dönemlerini kontrol et
    for (const period of pricingPeriods) {
      const periodStart = parseISO(period.start_date);
      const periodEnd = parseISO(period.end_date);

      if (isWithinInterval(date, { start: periodStart, end: periodEnd })) {
        return Number(period.nightly_price);
      }
    }

    // Özel dönem yoksa NULL dön (eskiden defaultNightlyPrice dönüyordu)
    return null;
  }

  const daysWithPrice = useMemo(() => {
    const days: Date[] = [];
    pricingPeriods.forEach((period) => {
      const start = parseISO(period.start_date);
      const end = parseISO(period.end_date);
      let current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }
    });
    return days;
  }, [pricingPeriods]);

  // Fiyatsız günler (yeni)
  const daysWithoutPrice = useMemo(() => {
    // Bugünden itibaren 1 yıl sonrasına kadar olan günlerden fiyat tanımlı olmayanları bul
    const days: Date[] = [];
    const endDate = addDays(today, 365);
    let current = new Date(today);

    while (current <= endDate) {
      const hasPrice = daysWithPrice.some(
        (d) => format(d, "yyyy-MM-dd") === format(current, "yyyy-MM-dd"),
      );
      if (!hasPrice) {
        days.push(new Date(current));
      }
      current = addDays(current, 1);
    }

    return days;
  }, [daysWithPrice, today]);

  function calculateTotalPrice(
    from: Date,
    to: Date,
  ): {
    subtotal: number;
    priceBreakdown: Array<{ date: string; price: number }>;
    nights: number;
    averagePerNight: number;
    hasUndefinedPrice: boolean;
    undefinedDates: string[];
  } {
    const priceBreakdown: Array<{ date: string; price: number }> = [];
    const undefinedDates: string[] = [];
    let subtotal = 0;
    let current = new Date(from);
    let nights = 0;

    // Her gece için fiyatı hesapla
    while (current < to) {
      const nightlyPrice = getPriceForDate(current);

      if (nightlyPrice === null) {
        // Bu tarih için fiyat tanımlı değil
        undefinedDates.push(format(current, "dd/MM/yyyy"));
      } else {
        subtotal += nightlyPrice;
        priceBreakdown.push({
          date: format(current, "dd/MM/yyyy"),
          price: nightlyPrice,
        });
      }

      current = addDays(current, 1);
      nights++;
    }

    const averagePerNight =
      nights > 0 && priceBreakdown.length > 0 ? subtotal / priceBreakdown.length : 0;

    return {
      subtotal,
      priceBreakdown,
      nights,
      averagePerNight,
      hasUndefinedPrice: undefinedDates.length > 0,
      undefinedDates,
    };
  }

  // Check-in/out günlerini ve tamamen dolu günleri ayır
  const checkInDays = useMemo(() => {
    const days: Date[] = [];
    unavailable.forEach((u) => {
      if (u.type === "reserved") {
        days.push(startOfDay(parseISO(u.start)));
      }
    });
    return days;
  }, [unavailable]);

  const checkOutDays = useMemo(() => {
    const days: Date[] = [];
    unavailable.forEach((u) => {
      if (u.type === "reserved") {
        days.push(startOfDay(parseISO(u.end)));
      }
    });
    return days;
  }, [unavailable]);

  const turnoverDays = useMemo(() => {
    const inSet = new Set(checkInDays.map((d) => d.getTime()));
    const outSet = new Set(checkOutDays.map((d) => d.getTime()));
    const both: Date[] = [];
    inSet.forEach((t) => {
      if (outSet.has(t)) both.push(new Date(t));
    });
    return both;
  }, [checkInDays, checkOutDays]);

  const fullyBookedDays = useMemo(() => {
    const days: Date[] = [];
    unavailable.forEach((u) => {
      const start = startOfDay(parseISO(u.start));
      const end = startOfDay(parseISO(u.end));

      if (u.type === "reserved") {
        // Başlangıç ve bitiş hariç aradaki günler
        let current = addDays(start, 1);
        while (current < end) {
          days.push(new Date(current));
          current = addDays(current, 1);
        }
      } else if (u.type === "blocked") {
        // Bloke günler tamamen dolu
        let current = new Date(start);
        while (current <= end) {
          days.push(new Date(current));
          current = addDays(current, 1);
        }
      }
    });
    return days;
  }, [unavailable]);

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

  // disabled listesi: geçmiş + tamamen dolu günler
  const disabledMatchers = useMemo(() => {
    return [{ before: today }, ...fullyBookedDays, ...turnoverDays, ...daysWithoutPrice];
  }, [fullyBookedDays, today, turnoverDays, daysWithoutPrice]);

  // Aralık çakışması kontrolü
  function rangeConflictsWithUnavailable(start: Date, end: Date) {
    const s = startOfDay(start);
    const e = startOfDay(end);

    // Seçilen aralıktaki her günü kontrol et
    let current = new Date(s);
    while (current <= e) {
      // Eğer bu gün tamamen doluysa çakışma var
      if (fullyBookedDays.some((d) => d.getTime() === current.getTime())) {
        return true;
      }
      current = addDays(current, 1);
    }

    return false;
  }

  // Özel fiyat dönemleri için modifiers
  const pricingModifiers = useMemo(() => {
    const modifiers: { [key: string]: Date[] } = {};

    pricingPeriods.forEach((period, index) => {
      const days: Date[] = [];
      const start = parseISO(period.start_date);
      const end = parseISO(period.end_date);

      let current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }

      modifiers[`pricing_${index}`] = days;
    });
    modifiers["noPrice"] = daysWithoutPrice;

    return modifiers;
  }, [pricingPeriods, daysWithoutPrice]);

  // Fırsat günleri için modifier ekle
  const opportunityDays = useMemo(() => {
    const days: Date[] = [];
    opportunities.forEach((opp) => {
      const start = parseISO(opp.startDate);
      const end = parseISO(opp.endDate);
      let current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }
    });
    return days;
  }, [opportunities]);

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

    // Eğer kullanıcı aynı günü iki kere seçmişse (nights === 0)
    const nights = differenceInCalendarDays(selTo, selFrom);
    if (nights === 0) {
      return;
    }

    // 1) Seçilen aralık içinde geçmiş/güncel unavailable aralığı var mı?
    if (rangeConflictsWithUnavailable(selFrom, selTo)) {
      setError("Lütfen geçerli bir tarih aralığı seçiniz (dolu/kapalı günler arasına yazılamaz).");
      setRange(undefined);
      return;
    }

    // 3) FİYAT KONTROLÜ - YENİ
    const { subtotal, priceBreakdown, averagePerNight, hasUndefinedPrice, undefinedDates } =
      calculateTotalPrice(selFrom, selTo);

    if (hasUndefinedPrice) {
      setError("Üzgünüz, seçilen tarih için fiyatlar belirlenmemiştir!");
      setRange(undefined);
      return;
    }

    // Fiyat tanımlı, devam et
    const discount = nights >= 14 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal - discount;
    const deposit = Math.round(total * 0.35);

    setQuote({
      from: selFrom,
      to: selTo,
      nights,
      perNight: Math.round(averagePerNight),
      subtotal,
      discount,
      total,
      deposit,
      priceBreakdown,
    });

    setQuoteOpen(true);
  }

  // Özel fiyat dönemleri için renkler (güncellenmiş)
  const pricingStyles = useMemo(() => {
    const styles: { [key: string]: React.CSSProperties } = {};

    // Normal fiyat dönemleri
    pricingPeriods.forEach((_, index) => {
      styles[`pricing_${index}`] = {
        position: "relative",
        boxShadow: "inset 0 -4px #f9a8d4",
      };
    });

    // Fiyatsız günler için stil
    styles["noPrice"] = {
      backgroundColor: "#f3f4f6", // gri arka plan
      color: "#9ca3af", // gri metin
      textDecoration: "line-through", // üstü çizili
      cursor: "not-allowed",
    };

    return styles;
  }, [pricingPeriods]);

  return (
    <div className="mt-8">
      {/* Hata bandı */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700">
          {error}
        </div>
      )}

      {/* Fiyat Dönemleri Bilgisi */}
      {pricingPeriods.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">Fiyat Tanımlı Dönemler:</h3>
          <div className="space-y-1 text-sm">
            {pricingPeriods.map((period) => (
              <div key={period.id} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-pink-300" />
                <span>
                  {format(parseISO(period.start_date), "dd MMM", { locale: tr })} -
                  {format(parseISO(period.end_date), "dd MMM", { locale: tr })}:
                  <strong className="ml-1">₺{period.nightly_price}/gece</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takvim konteyneri */}
      <div className="rounded-xl border p-3">
        <DayPicker
          locale={tr}
          mode="range"
          numberOfMonths={2}
          fromMonth={today}
          showOutsideDays
          selected={range as DateRange}
          onSelect={onSelect}
          disabled={disabledMatchers}
          modifiers={{
            checkIn: checkInDays,
            checkOut: checkOutDays,
            turnover: turnoverDays,
            fullyBooked: fullyBookedDays,
            opportunity: opportunityDays, // Yeni
            ...pricingModifiers,
          }}
          modifiersStyles={{
            turnover: {
              background:
                "linear-gradient(135deg, transparent 44%, white 44%, white 56%, transparent 56%), #fb923c",
              color: "black",
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              pointerEvents: "none",
              cursor: "not-allowed",
            },
            checkOut: {
              background: "linear-gradient(135deg, #fb923c 50%, white 50%)",
              color: "black",
            },
            checkIn: {
              background: "linear-gradient(135deg, white 50%, #fb923c 50%)",
              color: "black",
            },
            fullyBooked: {
              backgroundColor: "#fb923c",
              color: "white",
            },
            opportunity: {
              position: "relative",
              boxShadow: "inset 0 -4px #ef4444", // Kırmızı alt çizgi
            },
            ...pricingStyles,
          }}
          className="!text-sm"
        />

        {/* Lejant (güncellenmiş) */}
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <Legend colorClass="bg-white border" label="Müsait" />
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-5 rounded border"
              style={{ background: "linear-gradient(135deg, #fb923c 50%, white 50%)" }}
            />
            <span>Check-out günü</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-5 rounded border"
              style={{ background: "linear-gradient(135deg, white 50%, #fb923c 50%)" }}
            />
            <span>Check-in günü</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-5 rounded border"
              style={{
                background:
                  "linear-gradient(135deg, transparent 44%, white 44%, white 56%, transparent 56%), #fb923c",
              }}
            />
            <span>Devir günü</span>
          </div>
          {opportunities.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-5 rounded border bg-white"
                style={{ boxShadow: "inset 0 -4px #ef4444" }}
              />
              <span>Fırsat Dönemi (%20 İndirim)</span>
            </div>
          )}
          <Legend colorClass="bg-orange-500" label="Rezerve" />
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-5 rounded border bg-white"
              style={{ boxShadow: "inset 0 -4px #f9a8d4" }}
            />
            <span>Fiyat Tanımlı</span>
          </div>
          <Legend colorClass="bg-gray-300 line-through" label="Fiyatsız" />
        </div>
      </div>

      {/* Fiyat özet pop-up */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rezervasyon Özeti</DialogTitle>
            <DialogDescription>{villaName}</DialogDescription>
          </DialogHeader>

          {quote && (
            <div className="space-y-3">
              <Row label="Gece Sayısı" value={`${quote.nights} gece`} />
              <Row label="Ortalama Gecelik" value={tl.format(quote.perNight)} />

              {/* Fiyat Detayı */}
              {quote.priceBreakdown && quote.priceBreakdown.length > 0 && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer text-sm font-medium">Fiyat Detayı</summary>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    {quote.priceBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs py-1 border-b last:border-0"
                      >
                        <span>{item.date}</span>
                        <span>₺{item.price}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

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
                      villaId: villaId || "",
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
            villaId={villaId || ""}
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
