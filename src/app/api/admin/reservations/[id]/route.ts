import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { isReservationStatus } from "@/domain/reservations/ReservationStatus";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const { status } = await request.json();

    if (!isReservationStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    if (status === "cancelled") {
      const { data, error } = await supabase.rpc("cancel_reservation", { p_id: id });
      if (error) {
        const responseStatus = error.code === "P0002" ? 404 : error.code === "23514" ? 409 : 500;
        return NextResponse.json({ error: error.message }, { status: responseStatus });
      }
      return NextResponse.json(data ?? { ok: true });
    }

    const { data: current, error: currentError } = await supabase
      .from("reservations")
      .select("id, status")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: currentError?.message ?? "Reservation not found" },
        { status: 404 },
      );
    }

    if (status === "confirmed" && current.status === "pending") {
      const { data, error } = await supabase.rpc("approve_pending_reservation", { p_id: id });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json(data ?? { ok: true });
    }

    if (status === "completed" && current.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed reservations can be completed" },
        { status: 409 },
      );
    }

    if (status === "pending" || status === "approved") {
      return NextResponse.json({ error: "Unsupported status transition" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Update reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
