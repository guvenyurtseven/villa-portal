import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addDays, format, parseISO } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date();
    const endDate = addDays(today, 30);

    // Tüm villaları al (gizli olmayanlar) - sadece gerekli verileri
    const { data: villas, error } = await supabase
      .from("villas")
      .select(
        `
        id,
        name,
        villa_photos(url, is_primary, order_index),
        villa_pricing_periods(start_date, end_date, nightly_price)
      `,
      )
      .eq("is_hidden", false)
      .limit(15);

    if (error) {
      console.error("Error fetching villas:", error);
      return NextResponse.json([]);
    }

    if (!villas || villas.length === 0) {
      return NextResponse.json([]);
    }

    // Her villa için rezervasyonları ve bloke tarihleri ayrı sorgula
    const opportunityVillas = [];

    for (const villa of villas) {
      // Bu villa'nın fiyat dönemi yoksa atla
      if (!villa.villa_pricing_periods || villa.villa_pricing_periods.length === 0) {
        continue;
      }

      // Bu villa için rezervasyonları al
      const { data: reservations } = await supabase
        .from("reservations")
        .select("date_range")
        .eq("villa_id", villa.id)
        .eq("status", "confirmed");

      // Bu villa için bloke tarihleri al
      const { data: blockedDates } = await supabase
        .from("blocked_dates")
        .select("date_range")
        .eq("villa_id", villa.id);

      // Dolu günleri hesapla
      const unavailableDays = new Set<string>();

      // Rezervasyonları işle
      if (reservations) {
        reservations.forEach((res: any) => {
          const match = res.date_range?.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
          if (match) {
            try {
              const start = parseISO(match[1]);
              const end = parseISO(match[2]);
              let current = new Date(start);
              while (current < end) {
                unavailableDays.add(format(current, "yyyy-MM-dd"));
                current = addDays(current, 1);
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        });
      }

      // Bloke tarihleri işle
      if (blockedDates) {
        blockedDates.forEach((block: any) => {
          const match = block.date_range?.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
          if (match) {
            try {
              const start = parseISO(match[1]);
              const end = parseISO(match[2]);
              let current = new Date(start);
              while (current < end) {
                unavailableDays.add(format(current, "yyyy-MM-dd"));
                current = addDays(current, 1);
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        });
      }

      // Boşlukları bul
      const gaps = [];
      let currentStart = new Date(today);

      while (currentStart < endDate && gaps.length < 3) {
        const dateStr = format(currentStart, "yyyy-MM-dd");

        if (!unavailableDays.has(dateStr)) {
          let gapEnd = currentStart;
          let gapDays = 0;

          // Boş günleri say
          while (gapEnd < endDate && gapDays < 7) {
            const nextDateStr = format(gapEnd, "yyyy-MM-dd");
            if (unavailableDays.has(nextDateStr)) break;

            // Fiyat kontrolü - basitleştirilmiş
            const hasPrice = villa.villa_pricing_periods.some((period: any) => {
              const periodStart = parseISO(period.start_date);
              const periodEnd = parseISO(period.end_date);
              return gapEnd >= periodStart && gapEnd <= periodEnd;
            });

            if (!hasPrice) break;

            gapEnd = addDays(gapEnd, 1);
            gapDays++;
          }

          // 2-7 gün arası boşluklar
          if (gapDays >= 2 && gapDays <= 7) {
            // Toplam fiyatı hesapla
            let totalPrice = 0;
            let checkDate = new Date(currentStart);

            for (let i = 0; i < gapDays; i++) {
              const period = villa.villa_pricing_periods.find((p: any) => {
                const periodStart = parseISO(p.start_date);
                const periodEnd = parseISO(p.end_date);
                return checkDate >= periodStart && checkDate <= periodEnd;
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
                totalPrice: totalPrice, // originalPrice yerine totalPrice
                nightlyPrice: Math.round(totalPrice / gapDays), // Gecelik ortalama fiyat
              });
            }
          }

          currentStart = addDays(gapEnd, 1);
        } else {
          currentStart = addDays(currentStart, 1);
        }
      }

      // Fırsatlar varsa ekle
      if (gaps.length > 0) {
        const primaryPhoto =
          villa.villa_photos?.find((p: any) => p.is_primary)?.url || villa.villa_photos?.[0]?.url;

        opportunityVillas.push({
          id: villa.id,
          name: villa.name,
          photo: primaryPhoto,
          opportunities: gaps,
        });
      }
    }

    return NextResponse.json(opportunityVillas);
  } catch (error) {
    console.error("Opportunity villas error:", error);
    return NextResponse.json([]);
  }
}
