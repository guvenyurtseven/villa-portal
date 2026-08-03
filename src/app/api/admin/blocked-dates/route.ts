import { NextResponse } from "next/server";
import {
  reservationRpcErrorMessage,
  reservationRpcErrorStatus,
} from "@/domain/reservations/ReservationApiErrors";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const villa_id = searchParams.get("villa_id");

    const supabase = createServiceRoleClient();
    let query = supabase.from("blocked_dates").select("*");

    if (villa_id) {
      query = query.eq("villa_id", villa_id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.error("Blocked dates fetch error:", error);
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
    const { villa_id, start_date, end_date, reason } = body;

    if (!villa_id || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("create_blocked_date", {
      p_villa_id: villa_id,
      p_checkin: start_date,
      p_checkout: end_date,
      p_reason: reason || null,
    });

    if (error) {
      console.error("Block dates error:", error);
      return NextResponse.json(
        { error: reservationRpcErrorMessage(error) },
        { status: reservationRpcErrorStatus(error) },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) {
      console.error("Delete block error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
