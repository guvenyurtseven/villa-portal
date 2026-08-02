"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCalendarData } from "@/lib/adminCalendar/api";
import type {
  BlockedDate,
  DiscountPeriod,
  PricingPeriod,
  Reservation,
  Villa,
} from "@/lib/adminCalendar/types";

export function useVillaCalendarData(villaId: string) {
  const [villa, setVilla] = useState<Villa | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [pricingPeriods, setPricingPeriods] = useState<PricingPeriod[]>([]);
  const [discountPeriods, setDiscountPeriods] = useState<DiscountPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!villaId) return;

    try {
      const data = await fetchCalendarData(villaId);
      setVilla(data.villa);
      setReservations(data.reservations);
      setBlockedDates(data.blockedDates);
      setPricingPeriods(data.pricingPeriods);
      if (data.discountPeriods) setDiscountPeriods(data.discountPeriods);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [villaId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    villa,
    reservations,
    blockedDates,
    pricingPeriods,
    discountPeriods,
    setDiscountPeriods,
    loading,
    reload,
  };
}
