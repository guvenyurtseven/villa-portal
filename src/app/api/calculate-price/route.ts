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

    // Villa bilgilerini al (temizlik ücreti dahil)
    const { data: villa, error: villaError } = await supabase
      .from("villas")
      .select("id, name, cleaning_fee")
      .eq("id", villa_id)
      .single();

    if (villaError || !villa) {
      return NextResponse.json({ error: "Villa bulunamadı" }, { status: 404 });
    }

    // Özel fiyat dönemlerini al
    const { data: pricingPeriods, error: pricingError } = await supabase
      .from("villa_pricing_periods")
      .select("*")
      .eq("villa_id", villa_id)
      .order("start_date", { ascending: true });

    if (pricingError) {
      console.error("Pricing periods fetch error:", pricingError);
      return NextResponse.json({ error: "Fiyat bilgileri alınamadı" }, { status: 500 });
    }

    // Belirli bir tarih için fiyatı hesapla
    function getPriceForDate(date: Date): number | null {
      if (!pricingPeriods || pricingPeriods.length === 0) {
        return null;
      }

      for (const period of pricingPeriods) {
        const periodStart = parseISO(period.start_date);
        const periodEnd = parseISO(period.end_date);

        if (isWithinInterval(date, { start: periodStart, end: periodEnd })) {
          return Number(period.nightly_price);
        }
      }

      return null;
    }

    // Toplam fiyatı hesapla
    const startDateObj = parseISO(start_date);
    const endDateObj = parseISO(end_date);
    let current = new Date(startDateObj);
    let subtotal = 0;
    let nights = 0;
    const priceBreakdown = [];
    const undefinedPriceDates = [];

    // Her gece için fiyatı hesapla
    while (current < endDateObj) {
      const nightlyPrice = getPriceForDate(current);

      if (nightlyPrice === null) {
        undefinedPriceDates.push(format(current, "dd/MM/yyyy"));
      } else {
        subtotal += nightlyPrice;
        priceBreakdown.push({
          date: format(current, "yyyy-MM-dd"),
          price: nightlyPrice,
        });
      }

      current = addDays(current, 1);
      nights++;
    }

    // Eğer fiyat tanımlı olmayan günler varsa hata dön
    if (undefinedPriceDates.length > 0) {
      return NextResponse.json(
        {
          error: "NO_PRICE_DEFINED",
          message: "Seçilen tarih aralığında fiyat tanımlanmamış günler bulunmaktadır",
          undefinedDates: undefinedPriceDates,
          nights: nights,
          definedPriceCount: priceBreakdown.length,
        },
        { status: 400 },
      );
    }

    // Temizlik ücreti hesapla (7 günden az rezervasyonlarda)
    const cleaningFee = nights < 7 ? Number(villa.cleaning_fee || 0) : 0;
    const hasCleaningFee = cleaningFee > 0;

    // İndirim hesapla (14 gece ve üzeri %5)
    const discount = 0;

    // Toplam hesaplama (temizlik ücreti indirimden sonra eklenir)
    const subtotalAfterDiscount = subtotal - discount;
    const total = subtotalAfterDiscount + cleaningFee;
    const deposit = Math.round(total * 0.35);
    const averagePerNight = nights > 0 ? Math.round(subtotal / nights) : 0;

    return NextResponse.json({
      nights,
      subtotal,
      discount,
      cleaningFee,
      hasCleaningFee,
      total,
      deposit,
      averagePerNight,
      priceBreakdown,
    });
  } catch (error) {
    console.error("Price calculation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
