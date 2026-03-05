import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const villa_id = searchParams.get("villa_id");

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("reservations")
      .select(
        `id, villa_id, status, guest_name, guest_email, guest_phone,
        total_price, notes, created_at, date_range,
        villa:villas (id, name)`,
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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { villa_id, start_date, end_date, guest_name, guest_email, guest_phone, notes } = body;

    if (!villa_id || !start_date || !end_date || !guest_name || !guest_phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(`${start_date}T00:00:00Z`);
    const endInclusive = new Date(`${end_date}T00:00:00Z`);
    if (!Number.isFinite(+start) || !Number.isFinite(+endInclusive) || endInclusive < start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const checkout = new Date(endInclusive);
    checkout.setUTCDate(checkout.getUTCDate() + 1);
    const checkoutDate = toIsoDate(checkout);

    const supabase = createServiceRoleClient();

    const { data: totalPrice, error: priceError } = await supabase.rpc("villa_total_price", {
      p_villa_id: villa_id,
      p_checkin: start_date,
      p_checkout: checkoutDate,
    });

    if (priceError) {
      console.error("Price calculation error:", priceError);
      return NextResponse.json({ error: "Price calculation failed" }, { status: 500 });
    }

    if (!totalPrice || totalPrice === 0) {
      return NextResponse.json({ error: "No pricing defined for selected dates" }, { status: 400 });
    }

    const dateRange = `[${start_date},${checkoutDate})`;

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert({
        villa_id,
        date_range: dateRange,
        guest_name,
        guest_email: guest_email || null,
        guest_phone,
        total_price: totalPrice,
        status: "pending",
        notes: notes || null,
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

    return NextResponse.json({ success: true, reservation });
  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}