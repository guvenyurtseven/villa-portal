"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import BookingForm from "@/components/site/BookingForm";
import Image from "next/image";
import { parseBookingSearchParams } from "@/domain/booking/BookingSearchParams";
import { formatTRYNoFraction } from "@/lib/formatters";

function BookingContent() {
  const searchParams = useSearchParams();
  const [recalculatedPrice, setRecalculatedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const bookingParams = useMemo(() => parseBookingSearchParams(searchParams), [searchParams]);
  const { villaId, villaName, villaImage, from, to, nights, total, cleaningFee, hasCleaningFee } =
    bookingParams;

  // Fiyatı yeniden hesapla (güvenlik için)
  useEffect(() => {
    async function recalculatePrice() {
      if (!villaId || !from || !to) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/calculate-price", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            villa_id: villaId,
            start_date: format(from, "yyyy-MM-dd"),
            end_date: format(to, "yyyy-MM-dd"),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecalculatedPrice(data.total);
        }
      } catch (error) {
        console.error("Price recalculation error:", error);
      } finally {
        setLoading(false);
      }
    }

    recalculatePrice();
  }, [villaId, from, to]);

  // Gerçek fiyat (güvenlik kontrolü sonrası)
  const finalTotal = recalculatedPrice || total;
  const finalDeposit = Math.round(finalTotal * 0.35);

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        {/* Başlık */}
        <h1 className="text-3xl font-bold mb-8">Rezervasyon Tamamla</h1>

        {/* Villa Bilgisi */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            {villaImage && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg sm:h-32 sm:w-32 sm:flex-shrink-0">
                <Image src={villaImage} alt={villaName} fill className="object-cover rounded-lg" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="mb-2 break-words text-xl font-semibold">{villaName}</h2>
              <div className="text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Giriş:</span>{" "}
                  {format(from, "dd MMMM yyyy, EEEE", { locale: tr })}
                </p>
                <p>
                  <span className="font-medium">Çıkış:</span>{" "}
                  {format(to, "dd MMMM yyyy, EEEE", { locale: tr })}
                </p>
                <p>
                  <span className="font-medium">Süre:</span> {nights} gece
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fiyat Özeti */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Fiyat Özeti</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <span className="text-gray-600">Ara Toplam</span>
              <span className="text-right font-semibold tabular-nums">
                {formatTRYNoFraction(total - cleaningFee)}
              </span>
            </div>
            {hasCleaningFee && (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <span className="text-gray-600">Temizlik Ücreti</span>
                  <span className="text-right font-semibold tabular-nums">
                    {formatTRYNoFraction(cleaningFee)}
                  </span>
                </div>
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
                  ⚠️ 7 günden az konaklamalarda uygulanır
                </div>
              </>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <span className="text-gray-600">Toplam Tutar</span>
              <span className="text-right font-semibold tabular-nums">
                {loading ? (
                  <span className="text-gray-400">Hesaplanıyor...</span>
                ) : (
                  formatTRYNoFraction(finalTotal)
                )}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <span className="text-gray-600">Ön Ödeme (%35)</span>
              <span className="text-right font-semibold tabular-nums">
                {loading ? (
                  <span className="text-gray-400">Hesaplanıyor...</span>
                ) : (
                  formatTRYNoFraction(finalDeposit)
                )}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm text-gray-500">
              <span>Kalan Ödeme (Girişte)</span>
              <span className="text-right tabular-nums">
                {formatTRYNoFraction(finalTotal - finalDeposit)}
              </span>
            </div>
          </div>
          {recalculatedPrice && recalculatedPrice !== total && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Fiyat güncellendi. Yeni toplam: {formatTRYNoFraction(recalculatedPrice)}
            </div>
          )}
        </div>

        {/* Rezervasyon Formu */}
        <div className="rounded-lg bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Misafir Bilgileri</h3>
          <BookingForm
            villaId={villaId}
            villaName={villaName}
            villaImage={villaImage}
            from={from}
            to={to}
            nights={nights}
            total={finalTotal}
            deposit={finalDeposit}
          />
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
