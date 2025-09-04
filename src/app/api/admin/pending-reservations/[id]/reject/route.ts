// src/app/api/admin/pending-reservations/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  // Bekleyen mi?
  const { data: r } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", id)
    .eq("status", "pending")
    .single();
  if (!r) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  // email_logs -> reservations FK temizle
  await supabase.from("email_logs").delete().eq("reservation_id", id);
  // rezervasyonu sil
  const { error: delErr } = await supabase.from("reservations").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
