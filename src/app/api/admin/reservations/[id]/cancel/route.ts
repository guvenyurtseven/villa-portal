import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

// params artık Promise. Next.js 15'te await edilmesi zorunlu.
type Ctx = { params: Promise<{ id: string }> };

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function POST(_req: Request, ctx: Ctx) {
  const supabase = createServiceRoleClient();

  // ⬇️ HATA SEBEBİ BUYDU: ctx.params Promise => await et
  const { id } = ParamsSchema.parse(await ctx.params);

  // (İsteğe bağlı) arşive yanlışlıkla düşmüşse oradan da temizle
  await supabase.from("past_reservations").delete().eq("id", id).throwOnError();

  // İptal politikası: iptal edilen rezervasyonu tamamen sil
  const { error } = await supabase.from("reservations").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
