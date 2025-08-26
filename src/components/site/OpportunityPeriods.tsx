"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Sparkles, TrendingDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Opportunity {
  startDate: string;
  endDate: string;
  nights: number;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
}

interface OpportunityPeriodsProps {
  opportunities: Opportunity[];
  onSelectDates?: (startDate: string, endDate: string) => void; // Zaten opsiyonel
}

export default function OpportunityPeriods({
  opportunities,
  onSelectDates,
}: OpportunityPeriodsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!opportunities || opportunities.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: tr });
  };

  const formatShortDate = (dateStr: string) => {
    return format(parseISO(dateStr), "d MMM", { locale: tr });
  };

  const handleSelect = (opportunity: Opportunity, index: number) => {
    setSelectedIndex(index);
    // onSelectDates varsa çağır, yoksa sadece local state'i güncelle
    if (onSelectDates) {
      onSelectDates(opportunity.startDate, opportunity.endDate);
    }
  };

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Fırsat Aralıkları</h3>
        <span className="ml-auto text-xs bg-red-500 text-white px-2 py-1 rounded-full">
          %20 İndirim
        </span>
      </div>

      <div className="space-y-3">
        {opportunities.map((opportunity, index) => (
          <div
            key={index}
            className={`
              bg-white rounded-lg border-2 p-3 cursor-pointer transition-all
              ${
                selectedIndex === index
                  ? "border-orange-500 shadow-md"
                  : "border-gray-200 hover:border-orange-300"
              }
            `}
            onClick={() => handleSelect(opportunity, index)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Tarih Aralığı */}
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {formatShortDate(opportunity.startDate)} -{" "}
                    {formatShortDate(opportunity.endDate)}
                  </span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                    {opportunity.nights} gece
                  </span>
                </div>

                {/* Fiyat Bilgisi */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 line-through">
                      ₺{opportunity.originalPrice.toLocaleString("tr-TR")}
                    </span>
                    <TrendingDown className="h-3 w-3 text-green-500" />
                    <span className="text-lg font-bold text-green-600">
                      ₺{opportunity.discountedPrice.toLocaleString("tr-TR")}
                    </span>
                  </div>
                </div>

                {/* Gece Başı Fiyat */}
                <div className="text-xs text-gray-500 mt-1">
                  ₺
                  {Math.round(opportunity.discountedPrice / opportunity.nights).toLocaleString(
                    "tr-TR",
                  )}{" "}
                  / gece
                </div>
              </div>

              {/* Seç Butonu */}
              <Button
                size="sm"
                variant={selectedIndex === index ? "default" : "outline"}
                className="ml-3"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opportunity, index);
                }}
              >
                {selectedIndex === index ? "Seçildi" : "Seç"}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            {/* Tasarruf Miktarı */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-green-600 font-medium">
                💰{" "}
                {(opportunity.originalPrice - opportunity.discountedPrice).toLocaleString("tr-TR")}{" "}
                TL tasarruf!
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-600">
        * Kısa süreli konaklamalar için özel indirimli fiyatlar. Fırsatları kaçırmayın!
      </div>
    </div>
  );
}
