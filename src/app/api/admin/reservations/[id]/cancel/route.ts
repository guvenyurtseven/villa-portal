import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createServiceRoleClient();
  const { id } = ParamsSchema.parse(ctx.params);

  // 1) Kaydı çek (var mı/yetki)
  const { data: existing, error: getErr } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("id", id)
    .single();

  if (getErr || !existing) {
    return NextResponse.json({ error: "Rezervasyon bulunamadı" }, { status: 404 });
  }
  if (existing.status === "cancelled") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  // 2) İptale çek
  const patch: Record<string, any> = { status: "cancelled" };
  // Eğer şemanızda varsa:
  // patch.cancelled_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("reservations")
    .update(patch)
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, reservation: data });
}
