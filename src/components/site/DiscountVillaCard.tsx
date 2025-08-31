"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Users, BedDouble, Bath } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

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

  province?: string;
  district?: string;
  neighborhood?: string;

  // Tekil & çoğul destek
  bedroom?: number | null;
  bathroom?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
};

export default function DiscountVillaCard(props: Props) {
  const {
    villaId,
    villaName,
    photo,
    startDate,
    endDate,
    discountedNightly,
    originalAvgNightly,
    discountPercent,
    capacity,
    province,
    district,
    neighborhood,
    bedroom,
    bathroom,
    bedrooms,
    bathrooms,
  } = props;

  // Gelen hangi isim olursa olsun normalize et
  const br = bedroom ?? bedrooms ?? null;
  const ba = bathroom ?? bathrooms ?? null;

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
        <div className="text-center bg-orange-500 text-white text-xs py-1">
          <h3 className="truncate font-semibold font-mono">{villaName}</h3>
        </div>
        <div className="p-3 space-y-2">
          {/* Başlık + yüzde */}
          <div className="flex items-center justify-between">
            {typeof discountPercent === "number" && discountPercent > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                -%{discountPercent}
              </span>
            )}
          </div>
          {/* Fiyat çizgisi */}
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
                <span className="text-xs text-gray-500 ml-1">/ gece</span>
              </>
            ) : (
              <>
                <span className="text-2xl leading-none font-bold text-gray-900">
                  {tl.format(discountedNightly)}
                </span>
                <span className="text-xs text-gray-500 ml-1">/ gece</span>
              </>
            )}
          </div>

          {(province || district || neighborhood) && (
            <p className="text-xs text-gray-500 truncate">
              {[province, district, neighborhood].filter(Boolean).join(" / ")}
            </p>
          )}

          {/* Tarih aralığı */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>
              {fmt(startDate)} - {fmt(endDate)}
            </span>
          </div>

          {/* Kapasite + Yatak + Banyo (tek satır) */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {typeof capacity === "number" && (
              <span className="flex items-center gap-1" title="Kişi">
                <Users className="h-4 w-4" />
                <span>{capacity}</span>
              </span>
            )}
            {typeof br === "number" && (
              <span className="flex items-center gap-1" title="Yatak odası">
                <BedDouble className="h-4 w-4" />
                <span>{br}</span>
              </span>
            )}
            {typeof ba === "number" && (
              <span className="flex items-center gap-1" title="Banyo">
                <Bath className="h-4 w-4" />
                <span>{ba}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
