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
        villa:villas(id, name)
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

    if (!villa_id || !start_date || !end_date || !guest_name || !guest_email || !guest_phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // RPC fonksiyonu ile fiyat hesapla (check-out günü hariç)
    const checkoutDate = new Date(end_date);
    checkoutDate.setDate(checkoutDate.getDate() + 1);
    const checkout = checkoutDate.toISOString().slice(0, 10);

    const { data: totalPrice, error: priceError } = await supabase.rpc("villa_total_price", {
      p_villa_id: villa_id,
      p_checkin: start_date,
      p_checkout: checkout,
    });

    if (priceError) {
      console.error("Price calculation error:", priceError);
      return NextResponse.json({ error: "Fiyat hesaplanamadı" }, { status: 500 });
    }

    // Fiyat tanımlı değilse
    if (!totalPrice || totalPrice === 0) {
      return NextResponse.json(
        {
          error: "Bu tarihler için fiyat tanımlanmamıştır",
        },
        { status: 400 },
      );
    }

    // PostgreSQL daterange formatı
    const dateRange = `[${start_date},${checkout})`;

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
        notes: notes || null,
      })
      .select()
      .single();

    if (reservationError) {
      console.error("Reservation creation error:", reservationError);
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
      reservation,
    });
  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
