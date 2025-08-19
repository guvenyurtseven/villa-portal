import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villa_id = searchParams.get("villa_id");

    const supabase = await createClient();

    let query = supabase
      .from("reservations")
      .select(
        `
        *,
        villa:villas(id, name, location)
      `,
      )
      .order("created_at", { ascending: false });

    if (villa_id) {
      query = query.eq("villa_id", villa_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Reservations fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { villa_id, start_date, end_date, guest_name, guest_email, guest_phone, notes } = body;

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

    // Tarih hesaplama
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const days = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(days / 7);
    const totalPrice = villa.weekly_price * weeks;

    // PostgreSQL daterange formatı
    const dateRange = `[${start_date},${end_date})`;

    // Rezervasyon oluştur
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert({
        villa_id,
        date_range: dateRange,
        guest_name,
        guest_email,
        guest_phone,
        total_price: totalPrice,
        status: "pending",
        notes,
      })
      .select()
      .single();

    if (reservationError) {
      if (reservationError.code === "23P01") {
        return NextResponse.json(
          { error: "Date conflict: These dates were just booked" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: reservationError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reservation: {
        ...reservation,
        total_price: totalPrice,
        days,
        weeks,
      },
    });
  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
