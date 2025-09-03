import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });

  const supabase = createServiceRoleClient();
  const resend = new Resend(key);

  // 1) Pending kayıtları çek (kendi şemanıza göre uyarlayın)
  const { data: pending, error: qErr } = await supabase
    .from("email_logs")
    .select("id, to_email, subject, html")
    .eq("status", "pending")
    .limit(20);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!pending || pending.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;
  for (const row of pending) {
    const { id, to_email, subject, html } = row;

    const { error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>", // prod’da verified domain kullanın
      to: [to_email || "delivered@resend.dev"],
      subject: subject || "Villa Portal",
      html: html || "<p>Merhaba!</p>",
      replyTo: "onboarding@resend.dev",
    });

    if (error) {
      console.error("send error for", id, error);
      await supabase
        .from("email_logs")
        .update({ status: "error", error: String(error) })
        .eq("id", id);
      continue;
    }

    sent++;
    await supabase
      .from("email_logs")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ ok: true, sent });
}
