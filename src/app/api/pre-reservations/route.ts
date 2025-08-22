import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import PreReservationEmail from "@/emails/PreReservationEmail";

// Bu route'un kesinlikle Node.js runtime'ta çalışmasını garanti et.
// Next.js'te Node.js varsayılan olsa da (Edge sınırlı API seti) bu satır güvenlidir.
// Docs: Route Handlers ve runtime seçimi.
export const runtime = "nodejs"; // 'edge' değil

const BodySchema = z.object({
  villaId: z.string().uuid(),
  villaName: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7, "Geçerli bir telefon girin"),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  message: z.string().max(2000).optional(),
  _hp: z.string().optional(),
});

export async function POST(req: Request) {
  // 1) JSON parse + doğrulama
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 2) Basit anti-spam
  if (data._hp && data._hp.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 204 });
  }

  // 3) Env kontrolleri – yoksa erken ve net hata ver
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing");
    return NextResponse.json(
      { error: "Email provider API key is not configured (RESEND_API_KEY)." },
      { status: 500 },
    );
  }
  const from = process.env.RESEND_FROM || "Villa Portal <onboarding@resend.dev>";
  let to = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (to.length === 0) {
    // Resend’in güvenli test alıcısı
    to = ["delivered@resend.dev"];
  }

  // 4) Gönderim
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data: sent, error } = await resend.emails.send({
      from,
      to,
      subject: `Ön Rezervasyon: ${data.villaName} (${data.startDate} → ${data.endDate})`,
      // Node SDK'da camelCase 'replyTo' kullanılır (API sayfası not düşüyor).
      replyTo: data.email,
      // React şablonu – Next.js entegrasyonunda önerilen yol
      react: PreReservationEmail({
        villaId: data.villaId,
        villaName: data.villaName,
        startDate: data.startDate,
        endDate: data.endDate,
        name: data.name,
        email: data.email,
        phone: data.phone,
        adults: data.adults,
        children: data.children,
        message: data.message,
        adminUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/villas/${data.villaId}/calendar`,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
      }),
    });

    if (error) {
      console.error("Resend send error:", error);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id: sent?.id });
  } catch (err: any) {
    console.error("Resend unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Email send failed" }, { status: 500 });
  }
}
