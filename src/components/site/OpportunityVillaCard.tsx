"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface Opportunity {
  startDate: string;
  endDate: string;
  nights: number;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
}

interface OpportunityVillaCardProps {
  villaId: string;
  villaName: string;
  photo?: string;
  opportunity: Opportunity;
}

export default function OpportunityVillaCard({
  villaId,
  villaName,
  photo,
  opportunity,
}: OpportunityVillaCardProps) {
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "d MMM", { locale: tr });
  };

  return (
    <Link
      href={`/villa/${villaId}?checkin=${opportunity.startDate}&checkout=${opportunity.endDate}`}
      className="block group"
    >
      <div className="relative border-2 border-orange-400 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-all duration-200 hover:border-orange-500">
        {/* İndirim Badge */}
        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />%{opportunity.discountPercentage}
        </div>

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
          {/* Villa Adı */}
          <h3 className="font-semibold text-sm truncate">{villaName}</h3>

          {/* Tarih Aralığı */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDate(opportunity.startDate)} - {formatDate(opportunity.endDate)}
            </span>
            <span className="text-orange-600 font-semibold">({opportunity.nights} gece)</span>
          </div>

          {/* Fiyat */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 line-through">
              ₺{opportunity.originalPrice.toLocaleString("tr-TR")}
            </span>
            <span className="text-xs text-orange-500">→</span>
            <span className="text-lg font-bold text-green-600">
              ₺{opportunity.discountedPrice.toLocaleString("tr-TR")}
            </span>
          </div>

          {/* Gece Başı Fiyat */}
          <div className="text-xs text-gray-500">
            ₺{Math.round(opportunity.discountedPrice / opportunity.nights).toLocaleString("tr-TR")}{" "}
            / gece
          </div>
        </div>
      </div>
    </Link>
  );
}
