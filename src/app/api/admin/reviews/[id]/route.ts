import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/reviews/:id
 * Body: { action: "approve" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // Next 15: await!
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== "approve") {
    return NextResponse.json({ error: "unsupported action" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("reviews")
    .update({ is_approved: true, approved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("approve error:", error);
    return NextResponse.json({ error: "approve failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/reviews/:id
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // Next 15: await!
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) {
    console.error("delete error:", error);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
