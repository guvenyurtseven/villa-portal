import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("cleanup_expired_calendar_periods");

  if (error) {
    console.error("cleanup_expired_calendar_periods rpc error:", error);
    return NextResponse.json({ error: "Cleanup failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    result: Array.isArray(data) ? (data[0] ?? null) : data ?? null,
  });
}

