import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("email_logs")
    .select(
      "id, recipient, email_type, status, created_at, reservation_id, villa_id, token, sent_at, error_message",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: (data ?? []).map((row) => ({
      ...row,
      to_email: row.recipient,
    })),
  });
}
