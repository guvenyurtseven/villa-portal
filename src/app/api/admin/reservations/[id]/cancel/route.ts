import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

type Ctx = { params: Promise<{ id: string }> };

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function POST(_req: Request, ctx: Ctx) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = ParamsSchema.parse(await ctx.params);
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("cancel_reservation", { p_id: id });

  if (error) {
    const status = error.code === "P0002" ? 404 : error.code === "23514" ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data ?? { ok: true });
}
