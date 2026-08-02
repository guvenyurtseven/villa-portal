"use client";

import { tr } from "date-fns/locale";
import { DayPicker, type DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockDatesPanel } from "@/components/admin/calendar/BlockDatesPanel";
import { CalendarLegend } from "@/components/admin/calendar/CalendarLegend";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type {
  CalendarDisabledDate,
  PeriodModifiers,
  PeriodStyles,
} from "@/lib/adminCalendar/calendarDates";
import type {
  BlockReasonChangeHandler,
  DateRangeChangeHandler,
  StringChangeHandler,
} from "@/lib/adminCalendar/callbackTypes";
import type { BlockReason } from "@/lib/adminCalendar/types";

type AvailabilityCalendarPanelProps = {
  selectedRange: DateRange | undefined;
  onSelectedRangeChange: DateRangeChangeHandler;
  disabledDates: CalendarDisabledDate[];
  checkInDays: Date[];
  checkOutDays: Date[];
  turnoverDays: Date[];
  fullyBookedDays: Date[];
  pricingModifiers: PeriodModifiers;
  pricingStyles: PeriodStyles;
  discountModifiers: PeriodModifiers;
  discountStyles: PeriodStyles;
  showPricingLegend: boolean;
  showDiscountLegend: boolean;
  blockReason: BlockReason;
  onBlockReasonChange: BlockReasonChangeHandler;
  customerName: string;
  onCustomerNameChange: StringChangeHandler;
  customerPhone: string;
  onCustomerPhoneChange: StringChangeHandler;
  customerEmail: string;
  onCustomerEmailChange: StringChangeHandler;
  blocking: boolean;
  onBlockDates: () => void;
};

export function AvailabilityCalendarPanel({
  selectedRange,
  onSelectedRangeChange,
  disabledDates,
  checkInDays,
  checkOutDays,
  turnoverDays,
  fullyBookedDays,
  pricingModifiers,
  pricingStyles,
  discountModifiers,
  discountStyles,
  showPricingLegend,
  showDiscountLegend,
  blockReason,
  onBlockReasonChange,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerEmail,
  onCustomerEmailChange,
  blocking,
  onBlockDates,
}: AvailabilityCalendarPanelProps) {
  const isNarrowCalendar = useMediaQuery("(max-width: 1023px)");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarih Bloke Et</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <p className="font-medium mb-2">📌 Takvim Kullanımı:</p>
          <ul className="space-y-1 text-gray-700">
            <li>
              • Check-in ve check-out günleri seçilebilir (aynı gün hem bitiş hem başlangıç
              olabilir)
            </li>
            <li>• Rezervasyonlar arası geçiş günlerinde temizlik yapılır</li>
          </ul>
        </div>

        <div className="overflow-hidden rounded-lg border p-2 sm:p-4">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={onSelectedRangeChange}
            disabled={disabledDates}
            numberOfMonths={isNarrowCalendar ? 1 : 2}
            locale={tr}
            modifiers={{
              checkIn: checkInDays,
              checkOut: checkOutDays,
              turnover: turnoverDays,
              fullyBooked: fullyBookedDays,
              ...pricingModifiers,
              ...discountModifiers,
            }}
            modifiersStyles={{
              turnover: {
                background:
                  "linear-gradient(135deg, transparent 44%, white 44%, white 56%, transparent 56%), #fb923c",
                color: "black",
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                pointerEvents: "none",
                cursor: "not-allowed",
              },
              checkOut: {
                background: "linear-gradient(135deg, #fb923c 50%, white 50%)",
                color: "black",
              },
              checkIn: {
                background: "linear-gradient(135deg, white 50%, #fb923c 50%)",
                color: "black",
              },
              fullyBooked: {
                backgroundColor: "#fb923c",
                color: "white",
                textDecoration: "line-through",
              },
              ...pricingStyles,
              ...discountStyles,
            }}
            className="admin-day-picker !text-sm"
          />
        </div>

        <CalendarLegend
          showPricingLegend={showPricingLegend}
          showDiscountLegend={showDiscountLegend}
        />

        <BlockDatesPanel
          selectedRange={selectedRange}
          blockReason={blockReason}
          onBlockReasonChange={onBlockReasonChange}
          customerName={customerName}
          onCustomerNameChange={onCustomerNameChange}
          customerPhone={customerPhone}
          onCustomerPhoneChange={onCustomerPhoneChange}
          customerEmail={customerEmail}
          onCustomerEmailChange={onCustomerEmailChange}
          blocking={blocking}
          onBlockDates={onBlockDates}
        />
      </CardContent>
    </Card>
  );
}
