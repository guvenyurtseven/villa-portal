"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type {
  DateRangeChangeHandler,
  IdHandler,
  NumberChangeHandler,
  StringChangeHandler,
} from "@/lib/adminCalendar/callbackTypes";
import type { DiscountPeriod } from "@/lib/adminCalendar/types";

type DiscountPeriodsPanelProps = {
  villaId: string;
  discountPeriods: DiscountPeriod[];
  newDiscountRange: DateRange | undefined;
  onNewDiscountRangeChange: DateRangeChangeHandler;
  newDiscountPrice: string;
  onNewDiscountPriceChange: StringChangeHandler;
  newDiscountPriority: number;
  onNewDiscountPriorityChange: NumberChangeHandler;
  onAddDiscountPeriod: () => void;
  onRemoveDiscountPeriod: IdHandler;
};

export function DiscountPeriodsPanel({
  villaId,
  discountPeriods,
  newDiscountRange,
  onNewDiscountRangeChange,
  newDiscountPrice,
  onNewDiscountPriceChange,
  newDiscountPriority,
  onNewDiscountPriorityChange,
  onAddDiscountPeriod,
  onRemoveDiscountPeriod,
}: DiscountPeriodsPanelProps) {
  const isNarrowCalendar = useMediaQuery("(max-width: 1023px)");

  return (
    <div className="mt-6 rounded-xl border p-3 sm:p-4">
      <h3 className="text-sm font-semibold mb-3">İndirim Dönemleri</h3>

      <div className="space-y-2 mb-4">
        {discountPeriods.length === 0 && (
          <div className="text-sm text-gray-500">Kayıtlı indirim dönemi yok.</div>
        )}
        {discountPeriods.map((period) => (
          <div key={period.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="font-medium text-sm">
                {period.start_date} – {period.end_date}
              </div>
              <div className="text-xs text-gray-600">
                ₺{period.nightly_price.toLocaleString("tr-TR")}/gece · Öncelik:{" "}
                {period.priority}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onRemoveDiscountPeriod(period.id)}>
              Sil
            </Button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label className="text-xs">Tarih Aralığı</Label>
          <div className="overflow-hidden rounded-md border p-2">
            <DayPicker
              mode="range"
              numberOfMonths={isNarrowCalendar ? 1 : 2}
              selected={newDiscountRange}
              onSelect={onNewDiscountRangeChange}
              className="admin-day-picker"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">İndirimli Fiyat (₺/gece)</Label>
            <Input
              type="number"
              min={1}
              value={newDiscountPrice}
              onChange={(event) => onNewDiscountPriceChange(event.target.value)}
              placeholder="1000"
            />
          </div>
          <div>
            <Label className="text-xs">Öncelik (1–10)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={newDiscountPriority}
              onChange={(event) => onNewDiscountPriorityChange(Number(event.target.value))}
              placeholder="5"
            />
          </div>
          <Button onClick={onAddDiscountPeriod} disabled={!villaId} className="w-full">
            İndirim Dönemi Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}
