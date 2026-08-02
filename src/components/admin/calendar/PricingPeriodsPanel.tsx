"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DollarSign, Loader2, X } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type {
  DateRangeChangeHandler,
  IdHandler,
  StringChangeHandler,
} from "@/lib/adminCalendar/callbackTypes";
import type { PricingPeriod } from "@/lib/adminCalendar/types";

type PricingPeriodsPanelProps = {
  pricingPeriods: PricingPeriod[];
  showPricingForm: boolean;
  onTogglePricingForm: () => void;
  pricingRange: DateRange | undefined;
  onPricingRangeChange: DateRangeChangeHandler;
  nightlyPrice: string;
  onNightlyPriceChange: StringChangeHandler;
  savingPrice: boolean;
  onSavePricingPeriod: () => void;
  onRemovePricingPeriod: IdHandler;
};

export function PricingPeriodsPanel({
  pricingPeriods,
  showPricingForm,
  onTogglePricingForm,
  pricingRange,
  onPricingRangeChange,
  nightlyPrice,
  onNightlyPriceChange,
  savingPrice,
  onSavePricingPeriod,
  onRemovePricingPeriod,
}: PricingPeriodsPanelProps) {
  const isNarrowCalendar = useMediaQuery("(max-width: 1023px)");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Özel Fiyat Dönemleri
          </CardTitle>
          <Button onClick={onTogglePricingForm} variant="outline" size="sm" className="w-full sm:w-auto">
            {showPricingForm ? "İptal" : "Yeni Dönem Ekle"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {showPricingForm && (
          <div className="mb-6 space-y-4 rounded-lg border bg-gray-50 p-3 sm:p-4">
            <div className="overflow-hidden rounded-lg border bg-white p-2 sm:p-4">
              <Label className="mb-2 block">Tarih Aralığı Seçin</Label>
              <DayPicker
                mode="range"
                selected={pricingRange}
                onSelect={onPricingRangeChange}
                disabled={{ before: new Date() }}
                numberOfMonths={isNarrowCalendar ? 1 : 2}
                locale={tr}
                className="admin-day-picker"
              />
            </div>

            {pricingRange?.from && pricingRange?.to && (
              <>
                <div>
                  <Label htmlFor="nightlyPrice">Gecelik Fiyat (₺)</Label>
                  <Input
                    id="nightlyPrice"
                    type="number"
                    value={nightlyPrice}
                    onChange={(event) => onNightlyPriceChange(event.target.value)}
                    placeholder="Örn: 6800"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Seçilen dönem: {format(pricingRange.from, "dd MMM yyyy", { locale: tr })} -
                    {format(pricingRange.to, "dd MMM yyyy", { locale: tr })}
                  </p>
                </div>

                <Button
                  onClick={onSavePricingPeriod}
                  disabled={savingPrice || !nightlyPrice}
                  className="w-full"
                >
                  {savingPrice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    "Fiyat Dönemini Kaydet"
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {pricingPeriods.length > 0 ? (
          <div className="space-y-2">
            {pricingPeriods.map((period) => (
              <div key={period.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {period.start_date} - {period.end_date}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₺{period.nightly_price.toLocaleString("tr-TR")} / gece
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onRemovePricingPeriod(period.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Henüz fiyat dönemi tanımlanmamış</p>
            <p className="text-sm mt-1">
              Rezervasyon alabilmek için en az bir fiyat dönemi tanımlamalısınız
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
