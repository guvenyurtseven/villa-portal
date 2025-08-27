"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Opportunity {
  startDate: string;
  endDate: string;
  nights: number;
  totalPrice: number;
  nightlyPrice: number;
}

interface OpportunityPeriodsProps {
  opportunities: Opportunity[];
  onSelectDates?: (startDate: string, endDate: string) => void;
}

export default function OpportunityPeriods({
  opportunities,
  onSelectDates,
}: OpportunityPeriodsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!opportunities || opportunities.length === 0) {
    return null;
  }

  const formatShortDate = (dateStr: string) => {
    return format(parseISO(dateStr), "d MMM", { locale: tr });
  };

  const handleSelect = (opportunity: Opportunity, index: number) => {
    setSelectedIndex(index);
    if (onSelectDates) {
      onSelectDates(opportunity.startDate, opportunity.endDate);
    }
  };

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Kısa Dönem Müsaitlik</h3>
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
                  <span className="text-lg font-bold text-gray-800">
                    ₺{opportunity.totalPrice.toLocaleString("tr-TR")}
                  </span>
                  <span className="text-sm text-gray-500">
                    (₺{opportunity.nightlyPrice.toLocaleString("tr-TR")} / gece)
                  </span>
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
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-600">
        * 7 günden kısa konaklamalar için müsait tarihler
      </div>
    </div>
  );
}
