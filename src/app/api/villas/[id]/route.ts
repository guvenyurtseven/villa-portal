import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays, format, parseISO, eachDayOfInterval, isWithinInterval } from "date-fns";

interface Params {
  params: Promise<{ id: string }>;
}

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

    // Fotoğrafları sırala
    if (villa.photos) {
      villa.photos.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    // Fırsat aralıklarını hesapla
    const today = new Date();
    const endDate = addDays(today, 30);
    const unavailableDays = new Set<string>();

    // Onaylı rezervasyonları işle
    villa.reservations?.forEach((res: any) => {
      if (res.status === "confirmed") {
        const match = res.date_range.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
        if (match) {
          const start = parseISO(match[1]);
          const end = parseISO(match[2]);
          eachDayOfInterval({ start, end: addDays(end, -1) }).forEach((day) => {
            unavailableDays.add(format(day, "yyyy-MM-dd"));
          });
        }
      }
    });

    // Bloke tarihleri işle
    villa.blocked_dates?.forEach((block: any) => {
      const match = block.date_range.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
      if (match) {
        const start = parseISO(match[1]);
        const end = parseISO(match[2]);
        eachDayOfInterval({ start, end: addDays(end, -1) }).forEach((day) => {
          unavailableDays.add(format(day, "yyyy-MM-dd"));
        });
      }
    });

    // Fırsat aralıklarını bul
    const opportunities = [];
    let currentStart = today;

    while (currentStart < endDate) {
      const dateStr = format(currentStart, "yyyy-MM-dd");

      if (!unavailableDays.has(dateStr)) {
        let gapEnd = currentStart;
        let gapDays = 0;

        while (gapEnd < endDate && gapDays < 7) {
          const nextDateStr = format(gapEnd, "yyyy-MM-dd");
          if (unavailableDays.has(nextDateStr)) break;

          // Fiyat tanımlı mı kontrol et
          const hasPrice = villa.villa_pricing_periods?.some((period: any) => {
            const periodStart = parseISO(period.start_date);
            const periodEnd = parseISO(period.end_date);
            return isWithinInterval(gapEnd, { start: periodStart, end: periodEnd });
          });

          if (!hasPrice) break;

          gapEnd = addDays(gapEnd, 1);
          gapDays++;
        }

        if (gapDays >= 2 && gapDays <= 7) {
          // Fiyatı hesapla
          let totalPrice = 0;
          let checkDate = new Date(currentStart);

          for (let i = 0; i < gapDays; i++) {
            const period = villa.villa_pricing_periods?.find((p: any) => {
              const periodStart = parseISO(p.start_date);
              const periodEnd = parseISO(p.end_date);
              return isWithinInterval(checkDate, { start: periodStart, end: periodEnd });
            });

            if (period) {
              totalPrice += Number(period.nightly_price);
            }
            checkDate = addDays(checkDate, 1);
          }

          if (totalPrice > 0) {
            opportunities.push({
              startDate: format(currentStart, "yyyy-MM-dd"),
              endDate: format(addDays(currentStart, gapDays - 1), "yyyy-MM-dd"),
              nights: gapDays,
              originalPrice: totalPrice,
              discountedPrice: Math.round(totalPrice * 0.8), // %20 indirim
              discountPercentage: 20,
            });
          }
        }

        currentStart = addDays(gapEnd, 1);
      } else {
        currentStart = addDays(currentStart, 1);
      }
    }

    // Villa objesi ile fırsat aralıklarını birleştir
    const villaWithOpportunities = {
      ...villa,
      opportunities: opportunities.slice(0, 5), // En fazla 5 fırsat göster
    };

    return NextResponse.json(villaWithOpportunities);
  } catch (error) {
    console.error("Villa fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
