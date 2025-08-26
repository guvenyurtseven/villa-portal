import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addDays, format, parseISO, eachDayOfInterval, isWithinInterval } from "date-fns";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date();
    const endDate = addDays(today, 30);

    // Tüm villaları al (gizli olmayanlar)
    const { data: villas } = await supabase
      .from("villas")
      .select(
        `
        id,
        name,
        is_hidden,
        villa_photos(url, is_primary, order_index),
        reservations(date_range, status),
        blocked_dates(date_range),
        villa_pricing_periods(start_date, end_date, nightly_price)
      `,
      )
      .eq("is_hidden", false);

    if (!villas) return NextResponse.json([]);

    const opportunityVillas = [];

    for (const villa of villas) {
      // Rezerve edilmiş ve bloke edilmiş günleri topla
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

      // 30 günlük periyotta 2-7 günlük boş aralıkları bul
      let currentStart = today;
      const gaps = [];

      while (currentStart < endDate) {
        const dateStr = format(currentStart, "yyyy-MM-dd");

        if (!unavailableDays.has(dateStr)) {
          // Boş gün bulundu, aralığı genişlet
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
            // Fırsat fiyatı hesapla (örnek: %20 indirim)
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
              gaps.push({
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

      if (gaps.length > 0) {
        const primaryPhoto =
          villa.villa_photos?.find((p: any) => p.is_primary)?.url || villa.villa_photos?.[0]?.url;

        opportunityVillas.push({
          id: villa.id,
          name: villa.name,
          photo: primaryPhoto,
          opportunities: gaps.slice(0, 3), // En fazla 3 fırsat göster
        });
      }
    }

    // En fazla fırsatı olandan en aza sırala
    opportunityVillas.sort((a, b) => b.opportunities.length - a.opportunities.length);

    return NextResponse.json(opportunityVillas.slice(0, 10)); // En fazla 10 villa
  } catch (error) {
    console.error("Opportunity villas error:", error);
    return NextResponse.json([]);
  }
}
