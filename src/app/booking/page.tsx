"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { parseISO, format, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";
import BookingForm from "@/components/site/BookingForm";
import Image from "next/image";

// TL biçimleyici
const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

function BookingContent() {
  const searchParams = useSearchParams();
  const [recalculatedPrice, setRecalculatedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // URL'den parametreleri al
  const villaId = searchParams?.get("villaId") || "";
  const villaName = searchParams?.get("villaName") || "";
  const villaImage = searchParams?.get("villaImage") || "";
  const from = searchParams?.get("from") ? parseISO(searchParams.get("from")!) : new Date();
  const to = searchParams?.get("to") ? parseISO(searchParams.get("to")!) : new Date();
  const nights = parseInt(searchParams?.get("nights") || "0");
  const total = parseInt(searchParams?.get("total") || "0");
  const deposit = parseInt(searchParams?.get("deposit") || "0");
  const cleaningFee = parseInt(searchParams?.get("cleaningFee") || "0");
  const hasCleaningFee = searchParams?.get("hasCleaningFee") === "true";

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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Başlık */}
        <h1 className="text-3xl font-bold mb-8">Rezervasyon Tamamla</h1>

        {/* Villa Bilgisi */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-6">
            {villaImage && (
              <div className="relative w-32 h-32 flex-shrink-0">
                <Image src={villaImage} alt={villaName} fill className="object-cover rounded-lg" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">{villaName}</h2>
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Fiyat Özeti</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Ara Toplam</span>
              <span className="font-semibold">{tl.format(total - cleaningFee)}</span>
            </div>
            {hasCleaningFee && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Temizlik Ücreti</span>
                  <span className="font-semibold">{tl.format(cleaningFee)}</span>
                </div>
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
                  ⚠️ 7 günden az konaklamalarda uygulanır
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Toplam Tutar</span>
              <span className="font-semibold">
                {loading ? (
                  <span className="text-gray-400">Hesaplanıyor...</span>
                ) : (
                  tl.format(finalTotal)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ön Ödeme (%35)</span>
              <span className="font-semibold">
                {loading ? (
                  <span className="text-gray-400">Hesaplanıyor...</span>
                ) : (
                  tl.format(finalDeposit)
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Kalan Ödeme (Girişte)</span>
              <span>{tl.format(finalTotal - finalDeposit)}</span>
            </div>
          </div>
          {recalculatedPrice && recalculatedPrice !== total && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Fiyat güncellendi. Yeni toplam: {tl.format(recalculatedPrice)}
            </div>
          )}
        </div>

        {/* Rezervasyon Formu */}
        <div className="bg-white rounded-lg shadow-sm p-6">
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
