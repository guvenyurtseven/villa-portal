"use client";

import { useMemo, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { tr } from "date-fns/locale";
import { differenceInCalendarDays, parseISO, startOfDay, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DialogDescription } from "@radix-ui/react-dialog";
import "react-day-picker/dist/style.css";
import { formatTRYNoFraction } from "@/lib/formatters";
import {
  buildAvailabilityModifiers,
  getCheckInDays,
  getCheckOutDays,
  getDaysWithPrice,
  getDaysWithoutPrice,
  getDisabledMatchers,
  getDiscountDays,
  getFullyBookedDays,
  getOpportunityDays,
  getTurnoverDays,
  rangeConflictsWithUnavailable,
  type AvailabilityDiscountPeriod,
  type AvailabilityOpportunityPeriod,
  type AvailabilityPricingPeriod,
  type UnavailableRange,
} from "@/lib/availabilityCalendar/calculations";
import {
  buildBookingSearchParams,
  type AvailabilityQuote,
} from "@/lib/availabilityCalendar/quote";
import { useMediaQuery } from "@/lib/useMediaQuery";

type Range = { from?: Date; to?: Date };
type PriceApiResponse = {
  nights: number;
  subtotal: number;
  discount: number;
  cleaningFee: number;
  hasCleaningFee: boolean;
  total: number;
  deposit: number;
  averagePerNight: number;
  priceBreakdown: Array<{ date: string; price: number; source?: string }>;
};

interface AvailabilityCalendarProps {
  weeklyPrice?: number;
  unavailable: UnavailableRange[];
  villaName: string;
  villaImage: string;
  villaId?: string;
  pricingPeriods?: AvailabilityPricingPeriod[];
  opportunities?: AvailabilityOpportunityPeriod[];
  discountPeriods?: AvailabilityDiscountPeriod[];

  cleaningFee?: number; // Yeni prop
}
export default function AvailabilityCalendar({
  unavailable,
  villaName,
  villaImage,
  villaId,
  pricingPeriods = [],
  opportunities = [], // Yeni prop
  discountPeriods = [],
}: AvailabilityCalendarProps) {
  const [range, setRange] = useState<Range>();
  const [error, setError] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const router = useRouter();
  const [quote, setQuote] = useState<AvailabilityQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const isNarrowCalendar = useMediaQuery("(max-width: 767px)");
  const calendarMonths = isNarrowCalendar ? 1 : 2;

  // Bugünün başlangıcı (zaman bileşenlerini sıfırla)
  const today = useMemo(() => startOfDay(new Date()), []);

  const daysWithPrice = useMemo(() => {
    return getDaysWithPrice([...pricingPeriods, ...discountPeriods]);
  }, [pricingPeriods, discountPeriods]);

  // Fiyatsız günler (yeni)
  const daysWithoutPrice = useMemo(() => {
    return getDaysWithoutPrice(today, daysWithPrice);
  }, [daysWithPrice, today]);

  // Check-in/out günlerini ve tamamen dolu günleri ayır - GEÇMİŞ FİLTRELEMESİ EKLENDİ
  const checkInDays = useMemo(() => {
    return getCheckInDays(unavailable, today);
  }, [unavailable, today]);

  const checkOutDays = useMemo(() => {
    return getCheckOutDays(unavailable, today);
  }, [unavailable, today]);

  const turnoverDays = useMemo(() => {
    return getTurnoverDays(checkInDays, checkOutDays, today);
  }, [checkInDays, checkOutDays, today]);

  const fullyBookedDays = useMemo(() => {
    return getFullyBookedDays(unavailable, today);
  }, [unavailable, today]);

  // disabled listesi: geçmiş + tamamen dolu günler
  const disabledMatchers = useMemo(() => {
    return getDisabledMatchers(today, fullyBookedDays, turnoverDays, daysWithoutPrice);
  }, [fullyBookedDays, today, turnoverDays, daysWithoutPrice]);

  // İndirimli günler - geçmiş filtresi eklendi
  const discountDays = useMemo(() => {
    return getDiscountDays(discountPeriods, today);
  }, [discountPeriods, today]);

  // Fırsat günleri - geçmiş filtresi eklendi
  const opportunityDays = useMemo(() => {
    return getOpportunityDays(opportunities, today);
  }, [opportunities, today]);

  // Modifier'ları hiyerarşiye göre düzenle
  const modifiers = useMemo(() => {
    return buildAvailabilityModifiers({
      today,
      daysWithoutPrice,
      checkInDays,
      checkOutDays,
      turnoverDays,
      fullyBookedDays,
      daysWithPrice,
      discountDays,
      opportunityDays,
    });
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

  async function onSelect(next: DateRange | undefined) {
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
    if (rangeConflictsWithUnavailable(selFrom, selTo, fullyBookedDays)) {
      setError("Lütfen geçerli bir tarih aralığı seçiniz (dolu/kapalı günler arasına yazılamaz).");
      setRange(undefined);
      return;
    }

    if (!villaId) {
      setError("Villa bilgisi eksik oldugu icin fiyat hesaplanamadi.");
      setRange(undefined);
      return;
    }

    setQuote(null);
    setQuoteLoading(true);
    setQuoteOpen(true);

    try {
      const response = await fetch("/api/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villa_id: villaId,
          start_date: format(selFrom, "yyyy-MM-dd"),
          end_date: format(selTo, "yyyy-MM-dd"),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          "Secilen tarih araligi icin fiyat bilgisi hesaplanamadi.";
        setQuoteOpen(false);
        setRange(undefined);
        setError(message);
        return;
      }

      const price = data as PriceApiResponse;
      setQuote({
        from: selFrom,
        to: selTo,
        nights: price.nights ?? nights,
        perNight: Math.round(price.averagePerNight ?? 0),
        subtotal: Number(price.subtotal ?? 0),
        discount: Number(price.discount ?? 0),
        cleaningFee: Number(price.cleaningFee ?? 0),
        hasCleaningFee: Boolean(price.hasCleaningFee),
        total: Number(price.total ?? 0),
        deposit: Number(price.deposit ?? 0),
        priceBreakdown: price.priceBreakdown ?? [],
      });
    } catch {
      setQuoteOpen(false);
      setRange(undefined);
      setError("Fiyat hesaplanirken beklenmeyen bir hata olustu.");
    } finally {
      setQuoteLoading(false);
    }
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
      <div className="overflow-x-auto rounded-xl border p-3">
        <DayPicker
          locale={tr}
          mode="range"
          numberOfMonths={calendarMonths}
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

          {quoteLoading && (
            <div className="py-8 text-center text-sm text-gray-500">Fiyat hesaplaniyor...</div>
          )}

          {!quoteLoading && quote && (
            <div className="space-y-3">
              <Row label="Gece Sayısı" value={`${quote.nights} gece`} />
              <Row label="Ortalama Gecelik" value={formatTRYNoFraction(quote.perNight)} />

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
                        <span>{formatPriceBreakdownDate(item.date)}</span>
                        <span>₺{item.price}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <Row label="Ara Toplam" value={formatTRYNoFraction(quote.subtotal)} />
              {quote.discount > 0 && (
                <Row label="Kiralama İndirimi" value={`- ${formatTRYNoFraction(quote.discount)}`} />
              )}
              {quote.hasCleaningFee && (
                <>
                  <Row label="Temizlik Ücreti" value={formatTRYNoFraction(quote.cleaningFee)} />
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    📢 7 günden az rezervasyonlarda toplam ücrete bir defaya mahsus temizlik ücreti
                    eklenmektedir.
                  </div>
                </>
              )}
              <div className="mt-3 border-t pt-3">
                <Row strong label="Toplam" value={formatTRYNoFraction(quote.total)} />
                <Row label="Ön Ödeme" value={formatTRYNoFraction(quote.deposit)} />
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    const params = buildBookingSearchParams({
                      villaId,
                      villaName,
                      villaImage,
                      quote,
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

function formatPriceBreakdownDate(value: string) {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd/MM/yyyy");
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
      <span className={`min-w-0 text-gray-600 ${strong ? "font-semibold text-gray-800" : ""}`}>
        {label}
      </span>
      <span className={`text-right tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</span>
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
