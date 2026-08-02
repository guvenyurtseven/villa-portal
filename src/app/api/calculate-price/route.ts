import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

type DailyPriceRow = {
  day: string;
  nightly_price: number | null;
  source: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { villa_id, start_date, end_date } = body;

    if (!villa_id || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const checkin = parseISO(start_date);
    const checkout = parseISO(end_date);
    const nights = differenceInCalendarDays(checkout, checkin);

    if (!isValid(checkin) || !isValid(checkout) || nights <= 0) {
      return NextResponse.json({ error: "Gecersiz tarih araligi" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: villa, error: villaError } = await supabase
      .from("villas")
      .select("id, name, cleaning_fee")
      .eq("id", villa_id)
      .single();

    if (villaError || !villa) {
      return NextResponse.json({ error: "Villa bulunamadi" }, { status: 404 });
    }

    const { data: dailyPrices, error: dailyPriceError } = await supabase.rpc("villa_daily_prices", {
      p_villa_id: villa_id,
      p_checkin: start_date,
      p_checkout: end_date,
    });

    if (dailyPriceError) {
      console.error("Daily price calculation error:", dailyPriceError);
      return NextResponse.json({ error: "Fiyat bilgileri alinamadi" }, { status: 500 });
    }

    const rows = (dailyPrices ?? []) as DailyPriceRow[];
    const undefinedPriceDates = rows
      .filter((row) => row.nightly_price == null)
      .map((row) => format(parseISO(row.day), "dd/MM/yyyy"));

    if (rows.length !== nights || undefinedPriceDates.length > 0) {
      return NextResponse.json(
        {
          error: "NO_PRICE_DEFINED",
          message: "Secilen tarih araliginda fiyat tanimlanmamis gunler bulunmaktadir",
          undefinedDates: undefinedPriceDates,
          nights,
          definedPriceCount: rows.length - undefinedPriceDates.length,
        },
        { status: 400 },
      );
    }

    const { data: totalPrice, error: totalPriceError } = await supabase.rpc("villa_total_price", {
      p_villa_id: villa_id,
      p_checkin: start_date,
      p_checkout: end_date,
    });

    if (totalPriceError) {
      console.error("Total price calculation error:", totalPriceError);
      return NextResponse.json({ error: "Fiyat hesaplanamadi" }, { status: 500 });
    }

    if (totalPrice == null || Number(totalPrice) <= 0) {
      return NextResponse.json({ error: "NO_PRICE_DEFINED" }, { status: 400 });
    }

    const priceBreakdown = rows.map((row) => ({
      date: row.day,
      price: Number(row.nightly_price),
      source: row.source,
    }));
    const subtotal = priceBreakdown.reduce((sum, row) => sum + row.price, 0);
    const discount = nights >= 14 ? Math.round(subtotal * 0.05) : 0;
    const cleaningFee = nights < 7 ? Number(villa.cleaning_fee || 0) : 0;
    const total = Number(totalPrice);
    const deposit = Math.round(total * 0.35);
    const averagePerNight = nights > 0 ? Math.round(subtotal / nights) : 0;

    return NextResponse.json({
      nights,
      subtotal,
      discount,
      cleaningFee,
      hasCleaningFee: cleaningFee > 0,
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
