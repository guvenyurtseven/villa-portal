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
  isBefore,
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DialogDescription } from "@radix-ui/react-dialog";
import "react-day-picker/dist/style.css";

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
  discountPeriods?: Array<{
    id: string;
    villa_id: string;
    start_date: string;
    end_date: string;
    nightly_price: number;
    priority: number;
  }>;

  cleaningFee?: number; // Yeni prop
}
export default function AvailabilityCalendar({
  unavailable,
  villaName,
  villaImage,
  villaId,
  pricingPeriods = [],
  opportunities = [], // Yeni prop
  cleaningFee = 0, // Yeni prop
  discountPeriods = [],
}: AvailabilityCalendarProps) {
  const [range, setRange] = useState<Range>();
  const [error, setError] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const router = useRouter();
  const [quote, setQuote] = useState<{
    from: Date;
    to: Date;
    nights: number;
    perNight: number;
    subtotal: number;
    discount: number;
    cleaningFee: number;
    hasCleaningFee: boolean;
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

  // Check-in/out günlerini ve tamamen dolu günleri ayır - GEÇMİŞ FİLTRELEMESİ EKLENDİ
  const checkInDays = useMemo(() => {
    const days: Date[] = [];
    unavailable.forEach((u) => {
      if (u.type === "reserved") {
        const day = startOfDay(parseISO(u.start));
        if (!isBefore(day, today)) {
          // Geçmiş değilse
          days.push(day);
        }
      }
    });
    return days;
  }, [unavailable, today]);

  const checkOutDays = useMemo(() => {
    const days: Date[] = [];
    unavailable.forEach((u) => {
      if (u.type === "reserved") {
        const day = startOfDay(parseISO(u.end));
        if (!isBefore(day, today)) {
          // Geçmiş değilse
          days.push(day);
        }
      }
    });
    return days;
  }, [unavailable, today]);

  const turnoverDays = useMemo(() => {
    const inSet = new Set(checkInDays.map((d) => d.getTime()));
    const outSet = new Set(checkOutDays.map((d) => d.getTime()));
    const both: Date[] = [];
    inSet.forEach((t) => {
      if (outSet.has(t)) {
        const day = new Date(t);
        if (!isBefore(day, today)) {
          // Geçmiş değilse
          both.push(day);
        }
      }
    });
    return both;
  }, [checkInDays, checkOutDays, today]);

  const fullyBookedDays = useMemo(() => {
    const days: Date[] = [];
    unavailable.forEach((u) => {
      const start = startOfDay(parseISO(u.start));
      const end = startOfDay(parseISO(u.end));

      if (u.type === "reserved") {
        // Başlangıç ve bitiş hariç aradaki günler
        let current = addDays(start, 1);
        while (current < end) {
          if (!isBefore(current, today)) {
            // Geçmiş değilse
            days.push(new Date(current));
          }
          current = addDays(current, 1);
        }
      } else if (u.type === "blocked") {
        // Bloke günler tamamen dolu
        let current = new Date(start);
        while (current <= end) {
          if (!isBefore(current, today)) {
            // Geçmiş değilse
            days.push(new Date(current));
          }
          current = addDays(current, 1);
        }
      }
    });
    return days;
  }, [unavailable, today]);

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

  // İndirimli günler - geçmiş filtresi eklendi
  const discountDays = useMemo(() => {
    const days: Date[] = [];
    discountPeriods.forEach((period) => {
      const start = parseISO(period.start_date);
      const end = parseISO(period.end_date);
      let current = new Date(start);
      while (current <= end) {
        if (!isBefore(current, today)) {
          // Geçmiş değilse
          days.push(new Date(current));
        }
        current = addDays(current, 1);
      }
    });
    return days;
  }, [discountPeriods, today]);

  // Fırsat günleri - geçmiş filtresi eklendi
  const opportunityDays = useMemo(() => {
    const days: Date[] = [];
    opportunities.forEach((opp) => {
      const start = parseISO(opp.startDate);
      const end = parseISO(opp.endDate);
      let current = new Date(start);
      while (current <= end) {
        if (!isBefore(current, today)) {
          // Geçmiş değilse
          days.push(new Date(current));
        }
        current = addDays(current, 1);
      }
    });
    return days;
  }, [opportunities, today]);

  // Modifier'ları hiyerarşiye göre düzenle
  const modifiers = useMemo(() => {
    const mods: { [key: string]: Date[] } = {};

    // Temel modifierlar
    mods.past = [{ before: today }] as any;
    mods.noPrice = daysWithoutPrice;
    mods.checkIn = checkInDays;
    mods.checkOut = checkOutDays;
    mods.turnover = turnoverDays;
    mods.fullyBooked = fullyBookedDays;

    // Alt çizgi için modifierlar - hiyerarşik olarak filtrelenmiş
    const availableDays = new Set<string>();
    const allDays = new Set<string>();

    // Tüm fiyatlı günleri topla
    daysWithPrice.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      allDays.add(dateStr);

      // Geçmiş, dolu veya fiyatsız değilse müsait
      if (
        d >= today &&
        !fullyBookedDays.some((bd) => format(bd, "yyyy-MM-dd") === dateStr) &&
        !turnoverDays.some((td) => format(td, "yyyy-MM-dd") === dateStr)
      ) {
        availableDays.add(dateStr);
      }
    });

    // İndirimli günler (en yüksek öncelik)
    const discountDaysFiltered: Date[] = [];
    discountDays.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      if (availableDays.has(dateStr)) {
        discountDaysFiltered.push(d);
      }
    });

    // Fırsat günleri (indirimli olmayan)
    const opportunityDaysFiltered: Date[] = [];
    opportunityDays.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      if (
        availableDays.has(dateStr) &&
        !discountDaysFiltered.some((dd) => format(dd, "yyyy-MM-dd") === dateStr)
      ) {
        opportunityDaysFiltered.push(d);
      }
    });

    // Fiyat tanımlı günler (ne indirimli ne fırsat)
    const pricedOnlyDays: Date[] = [];
    daysWithPrice.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      if (
        availableDays.has(dateStr) &&
        !discountDaysFiltered.some((dd) => format(dd, "yyyy-MM-dd") === dateStr) &&
        !opportunityDaysFiltered.some((od) => format(od, "yyyy-MM-dd") === dateStr)
      ) {
        pricedOnlyDays.push(d);
      }
    });

    mods.discountDays = discountDaysFiltered;
    mods.opportunityDays = opportunityDaysFiltered;
    mods.pricedOnly = pricedOnlyDays;

    return mods;
  }, [
    today,
    daysWithoutPrice,
    checkInDays,
    checkOutDays,
    turnoverDays,
    fullyBookedDays,
    daysWithPrice,
    discountDays,
    opportunityDays,
  ]);

  // Modifier stilleri
  const modifiersStyles = useMemo(() => {
    return {
      // En yüksek öncelik: Geçmiş günler
      past: {
        backgroundColor: "#f3f4f6",
        color: "#000000",
        textDecoration: "line-through",
        textDecorationThickness: "1px",
        cursor: "not-allowed",
        pointerEvents: "none" as const,
      },
      // Fiyatsız günler
      noPrice: {
        backgroundColor: "#f3f4f6",
        color: "#000000",
        textDecoration: "line-through",
        textDecorationThickness: "1px",
        cursor: "not-allowed",
        pointerEvents: "none" as const,
      },
      // Devir günleri (özel pattern)
      turnover: {
        background:
          "linear-gradient(135deg, transparent 44%, white 44%, white 56%, transparent 56%), #fb923c",
        color: "black",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        pointerEvents: "none" as const,
        cursor: "not-allowed",
      },
      // Check-out günleri (yarı turuncu)
      checkOut: {
        background: "linear-gradient(135deg, #fb923c 50%, white 50%)",
        color: "black",
      },
      // Check-in günleri (yarı turuncu)
      checkIn: {
        background: "linear-gradient(135deg, white 50%, #fb923c 50%)",
        color: "black",
      },
      // Tamamen rezerve/bloke günler
      fullyBooked: {
        backgroundColor: "#fb923c",
        color: "white",
        cursor: "not-allowed",
        pointerEvents: "none" as const,
      },
      // Alt çizgi modifierları - sadece müsait günlerde görünür
      discountDays: {
        position: "relative" as const,
        boxShadow: "inset 0 -4px #ef4444",
      },
      opportunityDays: {
        position: "relative" as const,
        boxShadow: "inset 0 -4px #1f15ecff",
      },
      pricedOnly: {
        position: "relative" as const,
        boxShadow: "inset 0 -4px #f9a8d4",
      },
    };
  }, []);

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
    // DÖNEMSEL FİYATLANDIRMA İLE HESAPLAMA
    const { subtotal, priceBreakdown, averagePerNight } = calculateTotalPrice(selFrom, selTo);

    // Temizlik ücreti hesapla (7 günden az ise)
    const cleaningFeeAmount = nights < 7 ? cleaningFee : 0;
    const hasCleaningFee = cleaningFeeAmount > 0;

    const discount = nights >= 14 ? Math.round(subtotal * 0.05) : 0;
    const subtotalAfterDiscount = subtotal - discount;
    const total = subtotalAfterDiscount + cleaningFeeAmount;
    const deposit = Math.round(total * 0.35);

    setQuote({
      from: selFrom,
      to: selTo,
      nights,
      perNight: Math.round(averagePerNight),
      subtotal,
      discount,
      cleaningFee: cleaningFeeAmount,
      hasCleaningFee,
      total,
      deposit,
      priceBreakdown,
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

      {/* İndirimli Dönemler Bilgisi */}
      {discountPeriods.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">İndirimli Dönemler:</h3>
          <div className="space-y-1 text-sm">
            {discountPeriods.map((period) => (
              <div key={period.id} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-500" />
                <span>
                  {format(parseISO(period.start_date), "d MMM", { locale: tr })} –
                  {format(parseISO(period.end_date), "d MMM", { locale: tr })}:
                  <strong className="ml-1">₺{period.nightly_price}/gece</strong>
                </span>
              </div>
            ))}
          </div>
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
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="!text-sm"
        />

        {/* Lejant */}
        <div className="mt-2 py-4 flex flex-wrap gap-3 text-xs justify-center">
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
          <Legend colorClass="bg-orange-500" label="Rezerve/Bloke" />

          {/* Alt çizgi lejantları */}
          {discountPeriods.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-5 rounded border bg-white"
                style={{ boxShadow: "inset 0 -4px #ef4444" }}
              />
              <span>İndirimli Dönem</span>
            </div>
          )}

          {opportunities.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-5 rounded border bg-white"
                style={{ boxShadow: "inset 0 -4px #1f15ecff" }}
              />
              <span>Fırsat Dönemi</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span
              className="h-3 w-5 rounded border bg-white"
              style={{ boxShadow: "inset 0 -4px #f9a8d4" }}
            />
            <span>Fiyat Tanımlı</span>
          </div>
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
              {quote.hasCleaningFee && (
                <>
                  <Row label="Temizlik Ücreti" value={tl.format(quote.cleaningFee)} />
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    📢 7 günden az rezervasyonlarda toplam ücrete bir defaya mahsus temizlik ücreti
                    eklenmektedir.
                  </div>
                </>
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
                      cleaningFee: String(quote.cleaningFee || 0), // Yeni
                      hasCleaningFee: String(quote.hasCleaningFee || false), // Yeni
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
