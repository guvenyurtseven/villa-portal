import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Pending email'leri al
    const { data: pendingEmails, error: fetchError } = await supabase.rpc(
      "get_pending_review_emails",
    );

    if (fetchError) {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No pending emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const emailData of pendingEmails) {
      try {
        // Review linkini oluştur
        const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
        const reviewLink = `${appUrl}/review/${emailData.villa_id}?token=${emailData.token}`;

        // Email HTML içeriği
        const emailHtml = generateEmailTemplate(
          emailData.guest_name || "Değerli Misafirimiz",
          emailData.villa_name,
          reviewLink,
        );

        // Resend API ile email gönder
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Villa Değerlendirme <noreply@yourdomain.com>", // Kendi domain'inizi kullanın
            to: [emailData.recipient],
            subject: `${emailData.villa_name} konaklamanız nasıldı?`,
            html: emailHtml,
          }),
        });

        const emailResult = await emailResponse.json();

        if (emailResponse.ok) {
          // Email log'u güncelle
          await supabase
            .from("email_logs")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              external_id: emailResult.id,
            })
            .eq("id", emailData.email_log_id);

          results.push({
            email: emailData.recipient,
            status: "success",
            resend_id: emailResult.id,
          });
        } else {
          // Hata durumunda log güncelle
          await supabase
            .from("email_logs")
            .update({
              status: "failed",
              error_message: JSON.stringify(emailResult),
            })
            .eq("id", emailData.email_log_id);

          results.push({
            email: emailData.recipient,
            status: "failed",
            error: emailResult,
          });
        }
      } catch (emailError) {
        console.error(`Error sending email to ${emailData.recipient}:`, emailError);
        results.push({
          email: emailData.recipient,
          status: "error",
          error: emailError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
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
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Villa Değerlendirmesi</title>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #2c3e50; padding: 40px 20px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
            .content { padding: 40px 20px; }
            .button { 
                display: inline-block; 
                padding: 15px 30px; 
                background-color: #e74c3c; 
                color: #ffffff; 
                text-decoration: none; 
                border-radius: 5px; 
                font-weight: bold;
                margin: 20px 0;
            }
            .rating-info {
                background-color: #ecf0f1;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer { 
                background-color: #34495e; 
                padding: 20px; 
                text-align: center; 
                color: #ffffff; 
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Konaklamanız Nasıldı?</h1>
            </div>
            <div class="content">
                <p>Merhaba ${guestName},</p>
                
                <p><strong>${villaName}</strong> villamızda konaklamanızın sona erdiğini görüyoruz. 
                Umarız tatiliniz beklentilerinizi karşılamıştır ve keyifli zaman geçirmişsinizdir.</p>
                
                <p>Deneyiminizi bizimle paylaşmanız, hem hizmet kalitemizi artırmamıza hem de 
                diğer misafirlerimize yardımcı olmamıza katkı sağlayacaktır.</p>
                
                <div class="rating-info">
                    <h3 style="margin-top: 0;">🌟 Değerlendirmenizde şu kriterleri puanlayacaksınız:</h3>
                    <ul>
                        <li><strong>Temizlik:</strong> Villa ve çevresinin temizlik durumu</li>
                        <li><strong>Konfor:</strong> Villanın konforu ve donanımı</li>
                        <li><strong>Karşılama:</strong> Personelin ilgisi ve yardımseverliği</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="${reviewLink}" class="button">
                        Değerlendirmenizi Yapın
                    </a>
                    <p style="font-size: 14px; color: #7f8c8d;">
                        Bu işlem sadece 2-3 dakikanızı alacaktır.
                    </p>
                </div>
                
                <p style="margin-top: 30px;">Görüşleriniz bizim için çok değerli!</p>
                
                <p>Saygılarımızla,<br>
                Villa Kiralama Ekibi</p>
            </div>
            <div class="footer">
                <p>Bu e-posta size ${new Date().toLocaleDateString("tr-TR")} tarihinde gönderilmiştir.</p>
                <p>Bu link 14 gün boyunca geçerlidir.</p>
                <p>Eğer bu e-postayı beklemiyordunuz, lütfen dikkate almayın.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}
