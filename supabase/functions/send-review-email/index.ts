// supabase/functions/send-review-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PendingEmailRow = {
  email_log_id: string;
  recipient: string; // misafir e-posta
  guest_name?: string | null;
  villa_name: string;
  villa_id: string;
  token: string; // review token (tek kullanımlık)
  reservation_id?: string | null; // varsa, review_reminder_sent güncellemek için kullanacağız
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildReviewLink(appUrl: string, token: string) {
  // Route tasarımına göre sadece token ile gidiyoruz: /review/[token]
  try {
    return new URL(`/review/${token}`, appUrl).toString();
  } catch {
    // appUrl env bozuksa fallback
    return `${appUrl.replace(/\/$/, "")}/review/${token}`;
  }
}

function renderEmailHtml(guestName: string, villaName: string, reviewLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      <title>Villa Değerlendirmesi</title>
      <style>
        body { margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol', sans-serif; }
        .container { max-width:600px; margin:0 auto; background:#fff; }
        .header { background:#2c3e50; padding:32px 20px; text-align:center; }
        .header h1 { color:#fff; margin:0; font-size:22px; }
        .content { padding:32px 20px; color:#2c3e50; line-height:1.55; }
        .button {
          display:inline-block; padding:14px 24px; background:#e67e22; color:#fff; text-decoration:none;
          border-radius:6px; font-weight:600; margin:18px 0;
        }
        .rating-info { background:#ecf0f1; padding:16px; border-radius:6px; margin:18px 0; }
        .footer { background:#34495e; padding:16px; text-align:center; color:#fff; font-size:12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Konaklamanız nasıldı?</h1></div>
        <div class="content">
          <p>Merhaba ${guestName},</p>
          <p><strong>${villaName}</strong> villamızda konaklamanızın sona erdiğini görüyoruz. Umarız tatiliniz keyifli geçmiştir.</p>
          <p>Deneyiminizi bizimle paylaşmanız, hem hizmetimizi geliştirmemize hem de diğer misafirlerimize yardımcı olmamıza destek olur.</p>
          <div class="rating-info">
            <h3 style="margin-top:0;">🌟 Değerlendirme kriterleri:</h3>
            <ul>
              <li><strong>Temizlik</strong></li>
              <li><strong>Konfor</strong></li>
              <li><strong>Karşılama</strong></li>
            </ul>
          </div>
          <div style="text-align:center;">
            <a class="button" href="${reviewLink}">Değerlendirmenizi Yapın</a>
            <p style="font-size:13px; color:#7f8c8d;">Bu işlem yalnızca 2–3 dakikanızı alır.</p>
          </div>
          <p>Görüşleriniz bizim için çok değerli!</p>
          <p>Saygılarımızla,<br/>Villa Kiralama Ekibi</p>
        </div>
        <div class="footer">
          <p>Bu e-posta ${new Date().toLocaleDateString("tr-TR")} tarihinde gönderilmiştir.</p>
          <p>Bu link 14 gün boyunca geçerlidir.</p>
          <p>Eğer bu e-postayı beklemiyorduysanız lütfen dikkate almayın.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // İstek gövdesinden dryRun parametresini al (opsiyonel)
  let dryRun = false;
  try {
    const body = await req.json();
    if (body && typeof body.dryRun === "boolean") dryRun = body.dryRun;
  } catch {
    // body yoksa sorun değil → dryRun=false varsay
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // App URL (kamuya açık site adresiniz)
    const appUrl =
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
      "http://localhost:3000";

    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@yourdomain.com";
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "Villa Portal";

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    // dryRun=false ise Resend anahtarı zorunlu
    if (!dryRun && !resendApiKey) {
      return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Pending e-postaları al (RPC fonksiyon şemanıza göre dönüyor)
    const { data: pending, error: fetchErr } = await supabase.rpc<PendingEmailRow[]>(
      "get_pending_review_emails",
    );

    if (fetchErr) {
      return jsonResponse({ error: `Database error: ${fetchErr.message}` }, 500);
    }

    const pendingEmails = Array.isArray(pending) ? pending : [];

    // dryRun: Adayları döndür ve çık
    if (dryRun) {
      return jsonResponse({
        dryRun: true,
        count: pendingEmails.length,
        candidates: pendingEmails.map((p) => ({
          email_log_id: p.email_log_id,
          recipient: p.recipient,
          guest_name: p.guest_name,
          villa_name: p.villa_name,
          reservation_id: p.reservation_id ?? null,
        })),
      });
    }

    if (pendingEmails.length === 0) {
      return jsonResponse({ message: "No pending emails" });
    }

    // 2) Her bir alıcıya e-posta gönder
    const results: Array<
      | { email: string; status: "success"; resend_id: string }
      | { email: string; status: "failed"; error: unknown }
      | { email: string; status: "error"; error: string }
    > = [];

    for (const row of pendingEmails) {
      try {
        const reviewLink = buildReviewLink(appUrl, row.token);
        const html = renderEmailHtml(
          row.guest_name || "Değerli Misafirimiz",
          row.villa_name,
          reviewLink,
        );

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [row.recipient],
            subject: `${row.villa_name} konaklamanız nasıldı?`,
            html,
          }),
        });

        const data = await resp.json().catch(() => ({}));

        if (resp.ok && data?.id) {
          // email_logs güncelle
          await supabase
            .from("email_logs")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              external_id: String(data.id),
            })
            .eq("id", row.email_log_id);

          // (Varsa) rezervasyonu işaretle: review_reminder_sent = true
          if (row.reservation_id) {
            await supabase
              .from("reservations")
              .update({ review_reminder_sent: true })
              .eq("id", row.reservation_id);
          }

          results.push({ email: row.recipient, status: "success", resend_id: String(data.id) });
        } else {
          // Başarısızlık: log’a yaz
          await supabase
            .from("email_logs")
            .update({
              status: "failed",
              error_message: JSON.stringify(data ?? { status: resp.status }),
            })
            .eq("id", row.email_log_id);

          results.push({ email: row.recipient, status: "failed", error: data });
        }
      } catch (err: any) {
        console.error(`Error sending email to ${row.recipient}:`, err);

        await supabase
          .from("email_logs")
          .update({
            status: "failed",
            error_message: String(err?.message ?? err),
          })
          .eq("id", row.email_log_id);

        results.push({
          email: row.recipient,
          status: "error",
          error: String(err?.message ?? err),
        });
      }
    }

    return jsonResponse({ processed: results.length, results });
  } catch (e: any) {
    console.error("Function error:", e);
    return jsonResponse({ error: String(e?.message ?? e) }, 500);
  }
});
