import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildBusyRangesFromDateRangeRows,
  calculateLegacyDiscountedWindowOpportunities,
  type OpportunityDateRangeRow,
  type OpportunityPricingPeriod,
} from "@/domain/opportunities/OpportunityCalculator";

interface Params {
  params: Promise<{ id: string }>;
}

type SortablePhoto = {
  order_index?: number | null;
};

type ReservationRow = OpportunityDateRangeRow & {
  status?: string | null;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: villa, error } = await supabase
      .from("villas")
      .select(
        `
        *,
        photos:villa_photos(*),
        reservations(date_range, status),
        blocked_dates(date_range),
        villa_pricing_periods(start_date, end_date, nightly_price)
      `,
      )
      .eq("id", id)
      .single();

    if (error || !villa) {
      return NextResponse.json({ error: "Villa not found" }, { status: 404 });
    }

    if (Array.isArray(villa.photos)) {
      villa.photos.sort(
        (a: SortablePhoto, b: SortablePhoto) =>
          Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
      );
    }

    const confirmedReservations = ((villa.reservations ?? []) as ReservationRow[]).filter(
      (reservation) => reservation.status === "confirmed",
    );
    const blockedDates = (villa.blocked_dates ?? []) as OpportunityDateRangeRow[];
    const busyRanges = buildBusyRangesFromDateRangeRows([
      ...confirmedReservations,
      ...blockedDates,
    ]);

    const opportunities = calculateLegacyDiscountedWindowOpportunities({
      busyRanges,
      pricingPeriods: (villa.villa_pricing_periods ?? []) as OpportunityPricingPeriod[],
      windowDays: 30,
      minNights: 2,
      maxNights: 7,
      discountPercentage: 20,
      maxOpportunities: 5,
    });

    return NextResponse.json({
      ...villa,
      opportunities,
    });
  } catch (error) {
    console.error("Villa fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
