import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import type { Database } from "@/lib/supabase/database.types";
import { MAIL_FROM, SITE_URL } from "@/lib/email/config";

export const runtime = "nodejs";

type PendingReviewEmail =
  Database["public"]["Functions"]["get_pending_review_emails"]["Returns"][number];

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });

  const supabase = createServiceRoleClient();
  const resend = new Resend(key);

  const { data: pending, error: qErr } = await supabase.rpc("get_pending_review_emails");

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!pending || pending.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;
  const results: Array<{
    email_log_id: number;
    recipient: string;
    status: "success" | "failed" | "error";
    resend_id?: string | null;
    error?: string;
  }> = [];

  for (const row of (pending as PendingReviewEmail[]).slice(0, 20)) {
    const tokenResult = await supabase.rpc("ensure_review_token_for_reservation", {
      p_reservation_id: row.reservation_id,
    });

    const token = tokenResult.data?.[0]?.access_token ?? row.token;

    if (tokenResult.error || !token) {
      const message =
        tokenResult.error?.message ?? "ensure_review_token_for_reservation returned no token";

      await supabase
        .from("email_logs")
        .update({ status: "failed", error_message: message })
        .eq("id", row.email_log_id);

      results.push({
        email_log_id: row.email_log_id,
        recipient: row.recipient,
        status: "failed",
        error: message,
      });
      continue;
    }

    await supabase.from("email_logs").update({ token }).eq("id", row.email_log_id);

    const reviewLink = `${SITE_URL.replace(/\/$/, "")}/review/${encodeURIComponent(token)}`;
    const villaName = row.villa_name || "Villa";
    const guestName = row.guest_name || "Degerli Misafirimiz";

    const { data: emailData, error: sendError } = await resend.emails.send({
      from: MAIL_FROM,
      to: [row.recipient],
      subject: `${villaName} konaklamaniz nasildi?`,
      html: renderReviewEmail(guestName, villaName, reviewLink),
    });

    if (sendError) {
      const message = sendError.message || JSON.stringify(sendError);
      await supabase
        .from("email_logs")
        .update({ status: "failed", error_message: message })
        .eq("id", row.email_log_id);

      results.push({
        email_log_id: row.email_log_id,
        recipient: row.recipient,
        status: "failed",
        error: message,
      });
      continue;
    }

    const updateResult = await supabase
      .from("email_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        external_id: emailData?.id ?? null,
        error_message: null,
      })
      .eq("id", row.email_log_id);

    if (updateResult.error) {
      results.push({
        email_log_id: row.email_log_id,
        recipient: row.recipient,
        status: "error",
        resend_id: emailData?.id ?? null,
        error: updateResult.error.message,
      });
      continue;
    }

    sent++;
    results.push({
      email_log_id: row.email_log_id,
      recipient: row.recipient,
      status: "success",
      resend_id: emailData?.id ?? null,
    });
  }

  return NextResponse.json({ ok: true, sent, processed: results.length, results });
}

function renderReviewEmail(guestName: string, villaName: string, reviewLink: string): string {
  const safeGuestName = escapeHtml(guestName);
  const safeVillaName = escapeHtml(villaName);
  const safeReviewLink = escapeHtml(reviewLink);

  return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Villa Degerlendirmesi</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#1f2937;color:#ffffff;padding:32px 24px;text-align:center;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;">Konaklamaniz nasildi?</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;">
                <p style="margin:0 0 16px;">Merhaba ${safeGuestName},</p>
                <p style="margin:0 0 20px;"><strong>${safeVillaName}</strong> villamizdaki konaklamanizdan sonra deneyiminizi paylasmanizi rica ederiz.</p>
                <p style="margin:28px 0;text-align:center;">
                  <a href="${safeReviewLink}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;border-radius:6px;padding:14px 24px;font-weight:700;">Degerlendirme Yap</a>
                </p>
                <p style="margin:0;color:#6b7280;font-size:14px;">Bu link 14 gun gecerlidir.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
