// supabase/functions/send-review-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://www.xn--villadnyas-feb45d.com";

    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: "SUPABASE_URL missing in env" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY missing in env" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing in env" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Admin client (service role)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Pending email'leri çek
    const { data: pendingEmails, error: fetchError } = await supabase.rpc(
      "get_pending_review_emails",
    );
    if (fetchError) {
      return new Response(JSON.stringify({ error: `RPC error: ${fetchError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No pending emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results: Array<{
      email_log_id: number;
      email: string;
      status: "success" | "failed" | "error";
      resend_id?: string;
      update_error?: string;
      error?: unknown;
    }> = [];

    for (const emailData of pendingEmails) {
      try {
        // 🎯 YENİ: Token'ı DB'de GARANTİ ET ve DB'nin döndürdüğünü kullan
        const { data: ensured, error: ensureErr } = await supabase.rpc(
          "ensure_review_token_for_reservation",
          { p_reservation_id: emailData.reservation_id },
        );

        if (ensureErr || !ensured?.[0]?.access_token) {
          // email_logs -> failed
          await supabase
            .from("email_logs")
            .update({
              status: "failed",
              error_message: ensureErr?.message ?? "ensure_review_token_for_reservation failed",
            })
            .eq("id", emailData.email_log_id);

          results.push({
            email_log_id: emailData.email_log_id,
            email: emailData.recipient,
            status: "failed",
            error: ensureErr?.message ?? "ensure_review_token_for_reservation failed",
          });
          continue;
        }

        const token = ensured[0].access_token as string;

        // (Opsiyonel ama faydalı) email_logs.token'ı güncelle (audit/debug için)
        await supabase.from("email_logs").update({ token }).eq("id", emailData.email_log_id);

        // Linki DB'nin token'ı ile kur
        const reviewLink = `${appUrl}/review/${token}`;

        const emailHtml = generateEmailTemplate(
          emailData.guest_name || "Değerli Misafirimiz",
          emailData.villa_name,
          reviewLink,
        );

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Villa Dünyası <reviews@xn--villadnyas-feb45d.com>",
            to: [emailData.recipient],
            subject: `${emailData.villa_name} konaklamanız nasıldı?`,
            html: emailHtml,
          }),
        });

        const emailResult = (await emailResponse
          .json()
          .catch(() => ({}))) as Record<string, unknown>;
        const resendId = typeof emailResult.id === "string" ? emailResult.id : undefined;

        if (emailResponse.ok) {
          const { error: updErr } = await supabase
            .from("email_logs")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              external_id: resendId ?? null,
              error_message: null,
            })
            .eq("id", emailData.email_log_id);

          if (updErr) {
            results.push({
              email_log_id: emailData.email_log_id,
              email: emailData.recipient,
              status: "error",
              resend_id: resendId,
              update_error: updErr.message,
            });
          } else {
            results.push({
              email_log_id: emailData.email_log_id,
              email: emailData.recipient,
              status: "success",
              resend_id: resendId,
            });
          }
        } else {
          const { error: updErr } = await supabase
            .from("email_logs")
            .update({
              status: "failed",
              error_message: JSON.stringify(emailResult),
            })
            .eq("id", emailData.email_log_id);

          results.push({
            email_log_id: emailData.email_log_id,
            email: emailData.recipient,
            status: "failed",
            resend_id: resendId,
            update_error: updErr?.message,
          });
        }
      } catch (err) {
        results.push({
          email_log_id: emailData.email_log_id,
          email: emailData.recipient,
          status: "error",
          error: (err as Error)?.message ?? String(err),
        });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function generateEmailTemplate(guestName: string, villaName: string, reviewLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Villa Değerlendirmesi</title>
      <style>
        body { margin:0; padding:0; background:#f4f4f4; }
        .container { max-width:600px; margin:0 auto; background:#fff; }
        .header { background:#2c3e50; padding:40px 20px; text-align:center; color:#fff; }
        .content { padding:40px 20px; }
        .button { display:inline-block; padding:15px 30px; background:#e67e22; color:#fff; text-decoration:none; border-radius:6px; font-weight:600; }
        .rating-info { background:#ecf0f1; padding:16px; border-radius:6px; margin:20px 0; }
        .footer { background:#34495e; color:#fff; font-size:12px; padding:16px; text-align:center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Konaklamanız Nasıldı?</h1></div>
        <div class="content">
          <p>Merhaba ${guestName},</p>
          <p><strong>${villaName}</strong> villamızdaki konaklamanızın ardından deneyiminizi bizimle paylaşır mısınız?</p>
          <div class="rating-info">
            <strong>Değerlendirme kriterleri:</strong>
            <ul>
              <li>Temizlik</li>
              <li>Konfor</li>
              <li>Karşılama</li>
            </ul>
          </div>
          <p style="text-align:center; margin:28px 0;">
            <a href="${reviewLink}" class="button">Değerlendirme Yap</a>
          </p>
          <p>Görüşleriniz bizim için çok değerli. Teşekkür ederiz!</p>
        </div>
        <div class="footer">
          <p>Bu link 14 gün geçerlidir. Beklemiyorduysanız lütfen dikkate almayın.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
