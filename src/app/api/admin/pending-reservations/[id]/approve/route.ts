// src/app/api/admin/pending-reservations/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  // Tek adımda “müsaitse onayla”
  const { data, error } = await supabase.rpc("approve_pending_reservation", { p_id: id });
  // Yukarıdaki RPC’yi yazmak istemezseniz, aşağıdaki tek-sorguluk WHERE NOT EXISTS güncellemesini kullanın:
  // UPDATE reservations r
  //   SET status='confirmed'
  // WHERE r.id = $1 AND r.status='pending'
  //   AND NOT EXISTS (
  //        SELECT 1 FROM reservations c
  //        WHERE c.villa_id = r.villa_id
  //          AND c.status='confirmed'
  //          AND c.date_range && r.date_range)
  //   AND NOT EXISTS (
  //        SELECT 1 FROM blocked_dates b
  //        WHERE b.villa_id = r.villa_id
  //          AND b.date_range && r.date_range)
  // RETURNING r.*;

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (!data)
    return NextResponse.json({ error: "Müsait değil ya da zaten işlem görmüş" }, { status: 409 });

  return NextResponse.json({ ok: true, id });
}
