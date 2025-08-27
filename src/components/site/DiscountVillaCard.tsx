"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Users } from "lucide-react";
const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

type Props = {
  villaId: string;
  villaName: string;
  photo?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  discountedNightly: number;
  originalAvgNightly?: number | null;
  discountPercent?: number | null; // 0..100
  capacity?: number;
};

export default function DiscountVillaCard({
  villaId,
  villaName,
  photo,
  startDate,
  endDate,
  discountedNightly,
  originalAvgNightly,
  discountPercent,
  capacity,
}: Props) {
  const fmt = (d: string) => format(parseISO(d), "d MMM", { locale: tr });

  return (
    <Link
      href={`/villa/${villaId}?checkin=${startDate}&checkout=${endDate}`}
      className="block group"
    >
      <div className="relative border-2 border-orange-400 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-all duration-200 hover:border-orange-500">
        {/* Fotoğraf */}
        <div className="relative h-32 w-full overflow-hidden">
          <Image
            src={photo || "/placeholder.jpg"}
            alt={villaName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>

        {/* İçerik */}
        <div className="p-3 space-y-2">
          {/* Başlık + yüzde rozeti */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm truncate">{villaName}</h3>
            {typeof discountPercent === "number" && discountPercent > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                -%{discountPercent}
              </span>
            )}
          </div>

          {/* Tarih aralığı */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>
              {fmt(startDate)} - {fmt(endDate)}
            </span>
          </div>

          {/* Fiyat çizgisi: orijinal (üstü çizili) → indirimli */}
          <div className="mt-1 flex items-end gap-1">
            {originalAvgNightly && originalAvgNightly > 0 ? (
              <>
                <span className="text-xs text-gray-500 line-through">
                  {tl.format(originalAvgNightly)}
                </span>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-2xl leading-none font-bold text-gray-900">
                  {tl.format(discountedNightly)}
                </span>
                <span className="text-xs text-gray-500 ml-1">/gece</span>
              </>
            ) : (
              <>
                <span className="text-2xl leading-none font-bold text-gray-900">
                  {tl.format(discountedNightly)}
                </span>
                <span className="text-xs text-gray-500 ml-1">/gece</span>
              </>
            )}
          </div>
          {capacity && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{capacity} kişi</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
