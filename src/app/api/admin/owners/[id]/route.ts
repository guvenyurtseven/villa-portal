import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { OwnerUpdateSchema } from "@/lib/validation/owner";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("owners_with_villas")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ owner: data });
}

export async function PATCH(req: Request, { params }: Params) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();
  const body = await req.json();

  const parsed = OwnerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (parsed.data.full_name !== undefined) updates.full_name = parsed.data.full_name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;

  const { data, error } = await supabase
    .from("owners")
    .update(updates)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  return NextResponse.json({ ok: true, owner: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  const { count, error: cntErr } = await supabase
    .from("villas")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", params.id);

  if (cntErr) return NextResponse.json({ error: cntErr.message }, { status: 500 });
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "Bu sahibin atanmış villaları var. Silmeden önce villaları başka bir sahibe atayın.",
      },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("owners").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
