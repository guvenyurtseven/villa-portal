"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import "react-day-picker/dist/style.css";
import { AvailabilityCalendarPanel } from "@/components/admin/calendar/AvailabilityCalendarPanel";
import { BlockedDatesList } from "@/components/admin/calendar/BlockedDatesList";
import { DiscountPeriodsPanel } from "@/components/admin/calendar/DiscountPeriodsPanel";
import { PricingPeriodsPanel } from "@/components/admin/calendar/PricingPeriodsPanel";
import { ReservationsList } from "@/components/admin/calendar/ReservationsList";
import { VillaCalendarHeader } from "@/components/admin/calendar/VillaCalendarHeader";
import {
  buildDiscountModifiers,
  buildDiscountStyles,
  buildPricingModifiers,
  buildPricingStyles,
  getCheckInDays,
  getCheckOutDays,
  getDisabledDates,
  getFullyBookedDays,
  getTurnoverDays,
} from "@/lib/adminCalendar/calendarDates";
import { useBlockDatesForm } from "@/lib/adminCalendar/useBlockDatesForm";
import { useDiscountPeriodForm } from "@/lib/adminCalendar/useDiscountPeriodForm";
import { usePricingPeriodForm } from "@/lib/adminCalendar/usePricingPeriodForm";
import { useReservationActions } from "@/lib/adminCalendar/useReservationActions";
import { useVillaCalendarData } from "@/lib/adminCalendar/useVillaCalendarData";

export default function VillaCalendarPage() {
  const routeParams = useParams<{ id: string }>();
  const villaId = String(routeParams?.id || "");

  const {
    villa,
    reservations,
    blockedDates,
    pricingPeriods,
    discountPeriods,
    setDiscountPeriods,
    loading,
    reload,
  } = useVillaCalendarData(villaId);

  const pricingForm = usePricingPeriodForm({ villaId, reload });
  const discountForm = useDiscountPeriodForm({ villaId, setDiscountPeriods });
  const blockDatesForm = useBlockDatesForm({ villaId, reload });
  const reservationActions = useReservationActions({ reload });

  const checkInDays = useMemo(
    () => getCheckInDays(reservations, blockedDates),
    [reservations, blockedDates],
  );
  const checkOutDays = useMemo(
    () => getCheckOutDays(reservations, blockedDates),
    [reservations, blockedDates],
  );
  const turnoverDays = useMemo(
    () => getTurnoverDays(checkInDays, checkOutDays),
    [checkInDays, checkOutDays],
  );
  const fullyBookedDays = useMemo(
    () => getFullyBookedDays(reservations, blockedDates),
    [reservations, blockedDates],
  );
  const disabledDates = useMemo(
    () => getDisabledDates(fullyBookedDays, turnoverDays),
    [fullyBookedDays, turnoverDays],
  );
  const pricingModifiers = useMemo(
    () => buildPricingModifiers(pricingPeriods),
    [pricingPeriods],
  );
  const pricingStyles = useMemo(() => buildPricingStyles(pricingPeriods), [pricingPeriods]);
  const discountModifiers = useMemo(
    () => buildDiscountModifiers(discountPeriods),
    [discountPeriods],
  );
  const discountStyles = useMemo(() => buildDiscountStyles(discountPeriods), [discountPeriods]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VillaCalendarHeader villa={villa} />

      <PricingPeriodsPanel
        pricingPeriods={pricingPeriods}
        showPricingForm={pricingForm.showPricingForm}
        onTogglePricingForm={() => pricingForm.setShowPricingForm(!pricingForm.showPricingForm)}
        pricingRange={pricingForm.pricingRange}
        onPricingRangeChange={pricingForm.setPricingRange}
        nightlyPrice={pricingForm.nightlyPrice}
        onNightlyPriceChange={pricingForm.setNightlyPrice}
        savingPrice={pricingForm.savingPrice}
        onSavePricingPeriod={pricingForm.savePricingPeriod}
        onRemovePricingPeriod={pricingForm.removePricingPeriod}
      />

      <DiscountPeriodsPanel
        villaId={villaId}
        discountPeriods={discountPeriods}
        newDiscountRange={discountForm.newDiscountRange}
        onNewDiscountRangeChange={discountForm.setNewDiscountRange}
        newDiscountPrice={discountForm.newDiscountPrice}
        onNewDiscountPriceChange={discountForm.setNewDiscountPrice}
        newDiscountPriority={discountForm.newDiscountPriority}
        onNewDiscountPriorityChange={discountForm.setNewDiscountPriority}
        onAddDiscountPeriod={discountForm.addDiscountPeriod}
        onRemoveDiscountPeriod={discountForm.removeDiscountPeriod}
      />

      <AvailabilityCalendarPanel
        selectedRange={blockDatesForm.selectedRange}
        onSelectedRangeChange={blockDatesForm.setSelectedRange}
        disabledDates={disabledDates}
        checkInDays={checkInDays}
        checkOutDays={checkOutDays}
        turnoverDays={turnoverDays}
        fullyBookedDays={fullyBookedDays}
        pricingModifiers={pricingModifiers}
        pricingStyles={pricingStyles}
        discountModifiers={discountModifiers}
        discountStyles={discountStyles}
        showPricingLegend={pricingPeriods.length > 0}
        showDiscountLegend={discountPeriods.length > 0}
        blockReason={blockDatesForm.blockReason}
        onBlockReasonChange={blockDatesForm.setBlockReason}
        customerName={blockDatesForm.customerName}
        onCustomerNameChange={blockDatesForm.setCustomerName}
        customerPhone={blockDatesForm.customerPhone}
        onCustomerPhoneChange={blockDatesForm.setCustomerPhone}
        customerEmail={blockDatesForm.customerEmail}
        onCustomerEmailChange={blockDatesForm.setCustomerEmail}
        blocking={blockDatesForm.blocking}
        onBlockDates={blockDatesForm.blockDates}
      />

      <ReservationsList
        reservations={reservations}
        onUpdateReservationStatus={reservationActions.updateReservationStatus}
      />

      <BlockedDatesList blockedDates={blockedDates} onRemoveBlock={blockDatesForm.removeBlock} />
    </div>
  );
}
