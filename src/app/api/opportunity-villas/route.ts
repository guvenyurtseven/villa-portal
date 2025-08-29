import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addDays, format, parseISO, startOfDay } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PricingPeriod = {
  start_date: string;
  end_date: string;
  nightly_price: number;
};

type Photo = {
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

type VillaRow = {
  id: string;
  name: string;
  capacity: number | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  villa_photos: Photo[] | null;
  villa_pricing_periods: PricingPeriod[] | null;
};

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const today = startOfDay(new Date());
    const endDate = addDays(today, 30);

    // Gizli olmayan villaları çek (yalnızca gerekli alanlar)
    const { data: villas, error } = await supabase
      .from("villas")
      .select(
        `
        id,
        name,
        capacity,
        province,
        district,
        neighborhood,
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

    const opportunityVillas: Array<{
      id: string;
      name: string;
      capacity: number;
      photo?: string | null;
      // ↓ Yeni konum alanları JSON çıktısında mevcut
      province?: string | null;
      district?: string | null;
      neighborhood?: string | null;
      opportunities: Array<{
        startDate: string;
        endDate: string;
        nights: number;
        totalPrice: number;
        nightlyPrice: number;
      }>;
    }> = [];

    // Her villa için rezervasyonları ve blokajları çekip boşlukları hesapla
    for (const v of villas as VillaRow[]) {
      // Fiyat dönemi yoksa atla
      if (!v.villa_pricing_periods || v.villa_pricing_periods.length === 0) {
        continue;
      }

      // Bu villa için rezervasyonlar
      const { data: reservations } = await supabase
        .from("reservations")
        .select("date_range")
        .eq("villa_id", v.id)
        .eq("status", "confirmed");

      // Bu villa için bloke tarihler
      const { data: blockedDates } = await supabase
        .from("blocked_dates")
        .select("date_range")
        .eq("villa_id", v.id);

      // Dolu günleri hesapla (rezervasyon + blokaj iç günleri)
      const unavailableDays = new Set<string>();

      const pushRangeDays = (range?: string | null) => {
        const m = range?.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
        if (!m) return;
        try {
          const start = parseISO(m[1]);
          const end = parseISO(m[2]);
          let cur = new Date(start);
          while (cur < end) {
            unavailableDays.add(format(cur, "yyyy-MM-dd"));
            cur = addDays(cur, 1);
          }
        } catch (e) {
          console.error("Parse error:", e);
        }
      };

      reservations?.forEach((r: any) => pushRangeDays(r.date_range));
      blockedDates?.forEach((b: any) => pushRangeDays(b.date_range));

      // Boşlukları bul (önümüzdeki 30 gün içinde en fazla 3 fırsat)
      const gaps: Array<{
        startDate: string;
        endDate: string;
        nights: number;
        totalPrice: number;
        nightlyPrice: number;
      }> = [];

      let cursor = new Date(today);
      while (cursor < endDate && gaps.length < 3) {
        const cursorStr = format(cursor, "yyyy-MM-dd");

        if (!unavailableDays.has(cursorStr)) {
          let gapEnd = new Date(cursor);
          let gapDays = 0;

          // 7 güne kadar uygun günleri sırayla say
          while (gapEnd < endDate && gapDays < 7) {
            const dStr = format(gapEnd, "yyyy-MM-dd");
            if (unavailableDays.has(dStr)) break;

            // Bu gün için tanımlı bir fiyat dönemi olmalı
            const hasPrice = v.villa_pricing_periods!.some((p) => {
              const ps = parseISO(p.start_date);
              const pe = parseISO(p.end_date);
              return gapEnd >= ps && gapEnd <= pe;
            });
            if (!hasPrice) break;

            gapEnd = addDays(gapEnd, 1);
            gapDays++;
          }

          // 2–7 gece arası boşlukları değerlendir
          if (gapDays >= 2 && gapDays <= 7) {
            // Toplam fiyatı hesapla (dönemlere göre gecelik)
            let totalPrice = 0;
            let d = new Date(cursor);
            for (let i = 0; i < gapDays; i++) {
              const period = v.villa_pricing_periods!.find((p) => {
                const ps = parseISO(p.start_date);
                const pe = parseISO(p.end_date);
                return d >= ps && d <= pe;
              });
              if (period) totalPrice += Number(period.nightly_price);
              d = addDays(d, 1);
            }

            if (totalPrice > 0) {
              gaps.push({
                startDate: format(cursor, "yyyy-MM-dd"),
                endDate: format(addDays(cursor, gapDays - 1), "yyyy-MM-dd"),
                nights: gapDays,
                totalPrice,
                nightlyPrice: Math.round(totalPrice / gapDays),
              });
            }
          }

          cursor = addDays(gapEnd, 1);
        } else {
          cursor = addDays(cursor, 1);
        }
      }

      if (gaps.length > 0) {
        const primaryPhoto =
          v.villa_photos?.find((p) => p.is_primary)?.url || v.villa_photos?.[0]?.url || null;

        opportunityVillas.push({
          id: v.id,
          name: v.name,
          capacity: v.capacity || 4,
          photo: primaryPhoto,
          // ↓ Konum alanlarını response’a ekliyoruz
          province: v.province ?? null,
          district: v.district ?? null,
          neighborhood: v.neighborhood ?? null,
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
