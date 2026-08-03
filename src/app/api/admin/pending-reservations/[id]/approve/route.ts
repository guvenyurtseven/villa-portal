import { NextRequest, NextResponse } from "next/server";
import {
  approveReservationAndNotifyOwner,
  ReservationApprovalError,
} from "@/domain/reservations/approveReservation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id eksik" }, { status: 400 });

  try {
    const result = await approveReservationAndNotifyOwner(createServiceRoleClient(), id, {
      force: new URL(req.url).searchParams.get("force") === "1",
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof ReservationApprovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Reservation approval failed:", error);
    return NextResponse.json({ error: "Onay basarisiz" }, { status: 500 });
  }
}
