import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  reservationRpcErrorMessage,
  reservationRpcErrorStatus,
} from "@/domain/reservations/ReservationApiErrors";
import {
  addDaysToIsoDate,
  isoDateToUtcDate,
} from "@/lib/pgRange";

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

    const start = isoDateToUtcDate(start_date);
    const endInclusive = isoDateToUtcDate(end_date);
    const checkoutDate = addDaysToIsoDate(end_date, 1);
    if (!start || !endInclusive || !checkoutDate || endInclusive < start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: reservation, error: reservationError } = await supabase.rpc(
      "create_reservation",
      {
        p_villa_id: villa_id,
        p_checkin: start_date,
        p_checkout: checkoutDate,
        p_guest_name: guest_name,
        p_guest_phone: guest_phone,
        p_guest_email: guest_email || null,
        p_notes: notes || null,
        p_status: "pending",
      },
    );

    if (reservationError) {
      return NextResponse.json(
        { error: reservationRpcErrorMessage(reservationError) },
        { status: reservationRpcErrorStatus(reservationError) },
      );
    }

    return NextResponse.json({ success: true, reservation });
  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
