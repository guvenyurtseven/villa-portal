// src/app/api/opportunity-villas/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  calculateCheckoutGapOpportunities,
  toBusyRangeFromPgDateRange,
  type OpportunityBusyRange,
  type OpportunityPricingPeriod,
  type PricedOpportunity,
} from "@/domain/opportunities/OpportunityCalculator";
import { getSortedVillaPhotoUrls } from "@/domain/villas/PhotoSorting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PhotoRow = { url: string; is_primary: boolean | null; order_index: number | null };

type VillaRow = {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  capacity: number | null;
  priority: number | null;
  villa_photos: PhotoRow[] | null;
};

type DateRangeByVillaRow = {
  villa_id: string;
  date_range: string | null;
};

type PricingPeriodByVillaRow = OpportunityPricingPeriod & {
  villa_id: string;
};

const WINDOW_DAYS = 60;
const MIN_NIGHTS = 2;
const MAX_NIGHTS = 7;

export async function GET() {
  try {
    const supa = createServiceRoleClient();
    const today = new Date();

    const { data: villas, error: vErr } = await supa
      .from("villas")
      .select(
        `
        id, name, province, district, neighborhood, capacity, priority,
        villa_photos(url, is_primary, order_index)
      `,
      )
      .eq("is_hidden", false)
      .order("priority", { ascending: false })
      .order("id", { ascending: false })
      .limit(24);

    if (vErr) {
      console.error("villas error:", vErr);
      return NextResponse.json({ error: "Villas fetch failed" }, { status: 500 });
    }
    if (!villas || villas.length === 0) return NextResponse.json([]);

    const villaRows = villas as VillaRow[];
    const villaIds = villaRows.map((villa) => villa.id);

    const [resv, blks, priceRows] = await Promise.all([
      supa
        .from("reservations")
        .select("villa_id, date_range")
        .eq("status", "confirmed")
        .in("villa_id", villaIds),
      supa.from("blocked_dates").select("villa_id, date_range").in("villa_id", villaIds),
      supa
        .from("villa_pricing_periods")
        .select("villa_id, start_date, end_date, nightly_price")
        .in("villa_id", villaIds),
    ]);
    if (resv.error) {
      console.error("opportunity reservations error:", resv.error);
      return NextResponse.json({ error: "Reservations fetch failed" }, { status: 500 });
    }
    if (blks.error) {
      console.error("opportunity blocked dates error:", blks.error);
      return NextResponse.json({ error: "Blocked dates fetch failed" }, { status: 500 });
    }
    if (priceRows.error) {
      console.error("opportunity pricing error:", priceRows.error);
      return NextResponse.json({ error: "Pricing periods fetch failed" }, { status: 500 });
    }

    const byVillaBusy: Record<string, OpportunityBusyRange[]> = {};
    const reservationRows = (resv.data ?? []) as DateRangeByVillaRow[];
    const blockedRows = (blks.data ?? []) as DateRangeByVillaRow[];

    reservationRows.forEach((reservation) => {
      const busyRange = toBusyRangeFromPgDateRange(reservation.date_range);
      if (busyRange) (byVillaBusy[reservation.villa_id] ||= []).push(busyRange);
    });

    blockedRows.forEach((blockedDate) => {
      const busyRange = toBusyRangeFromPgDateRange(blockedDate.date_range);
      if (busyRange) (byVillaBusy[blockedDate.villa_id] ||= []).push(busyRange);
    });

    const byVillaPrices: Record<string, OpportunityPricingPeriod[]> = {};
    const pricingRows = (priceRows.data ?? []) as PricingPeriodByVillaRow[];

    pricingRows.forEach((pricingPeriod) => {
      (byVillaPrices[pricingPeriod.villa_id] ||= []).push({
        start_date: pricingPeriod.start_date,
        end_date: pricingPeriod.end_date,
        nightly_price: Number(pricingPeriod.nightly_price),
      });
    });

    const out: Array<{
      id: string;
      name: string;
      province: string | null;
      district: string | null;
      neighborhood: string | null;
      images: string[];
      opportunities: PricedOpportunity[];
      priority: number | null;
      capacity: number | null;
    }> = [];

    for (const villa of villaRows) {
      const opportunities = calculateCheckoutGapOpportunities({
        busyRanges: byVillaBusy[villa.id] ?? [],
        pricingPeriods: byVillaPrices[villa.id] ?? [],
        today,
        windowDays: WINDOW_DAYS,
        minNights: MIN_NIGHTS,
        maxNights: MAX_NIGHTS,
      });

      if (opportunities.length > 0) {
        out.push({
          id: villa.id,
          name: villa.name,
          province: villa.province,
          district: villa.district,
          neighborhood: villa.neighborhood,
          images: getSortedVillaPhotoUrls(villa.villa_photos).slice(0, 6),
          opportunities,
          priority: villa.priority ?? null,
          capacity: villa.capacity ?? null,
        });
      }
    }

    out.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return NextResponse.json(out);
  } catch (err) {
    console.error("opportunity-villas error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
