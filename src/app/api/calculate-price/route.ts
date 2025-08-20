import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseISO, addDays, format, isWithinInterval } from "date-fns";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { villa_id, start_date, end_date } = body;

    if (!villa_id || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Villa bilgilerini al
    const { data: villa, error: villaError } = await supabase
      .from("villas")
      .select("weekly_price")
      .eq("id", villa_id)
      .single();

    if (villaError || !villa) {
      return NextResponse.json({ error: "Villa not found" }, { status: 404 });
    }

    // Özel fiyat dönemlerini al
    const { data: pricingPeriods, error: pricingError } = await supabase
      .from("villa_pricing_periods")
      .select("*")
      .eq("villa_id", villa_id)
      .order("start_date", { ascending: true });

    if (pricingError) {
      console.error("Pricing periods fetch error:", pricingError);
    }

    // Default gecelik fiyat
    const defaultNightlyPrice = villa.weekly_price / 7;

    // Belirli bir tarih için fiyatı hesapla
    function getPriceForDate(date: Date): number {
      if (!pricingPeriods || pricingPeriods.length === 0) {
        return defaultNightlyPrice;
      }

      // Özel fiyat dönemlerini kontrol et
      for (const period of pricingPeriods) {
        const periodStart = parseISO(period.start_date);
        const periodEnd = parseISO(period.end_date);

        if (isWithinInterval(date, { start: periodStart, end: periodEnd })) {
          return Number(period.nightly_price);
        }
      }

      // Özel dönem yoksa default fiyat
      return defaultNightlyPrice;
    }

    // Toplam fiyatı hesapla
    const startDateObj = parseISO(start_date);
    const endDateObj = parseISO(end_date);
    let current = new Date(startDateObj);
    let subtotal = 0;
    let nights = 0;
    const priceBreakdown = [];

    // Her gece için fiyatı hesapla
    while (current < endDateObj) {
      const nightlyPrice = getPriceForDate(current);
      subtotal += nightlyPrice;
      priceBreakdown.push({
        date: format(current, "yyyy-MM-dd"),
        price: nightlyPrice,
      });
      current = addDays(current, 1);
      nights++;
    }

    // İndirim hesapla (14 gece ve üzeri %5)
    const discount = nights >= 14 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal - discount;
    const deposit = Math.round(total * 0.35);

    return NextResponse.json({
      nights,
      subtotal,
      discount,
      total,
      deposit,
      averagePerNight: nights > 0 ? Math.round(subtotal / nights) : 0,
      priceBreakdown,
    });
  } catch (error) {
    console.error("Price calculation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
