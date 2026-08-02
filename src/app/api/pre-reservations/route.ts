// src/app/api/pre-reservations/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PreReservationEmail from "@/emails/PreReservationEmail";
import {
  reservationRpcErrorMessage,
  reservationRpcErrorStatus,
} from "@/domain/reservations/ReservationApiErrors";
import { isoDateToUtcDate } from "@/lib/pgRange";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs"; // Resend + Supabase için Node.js runtime

/** İstek gövdesi doğrulama */
const BodySchema = z.object({
  villaId: z.string().uuid(),
  villaName: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7, "Geçerli bir telefon girin"),
  // Form’dan string gelebilir; güvenli biçimde sayıya coercede.
  adults: z.coerce.number().int().min(1).optional(),
  children: z.coerce.number().int().min(0).optional(),
  message: z.string().max(2000).optional(),
  _hp: z.string().optional(), // honeypot
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

  // 2) Basit anti-spam (honeypot doluysa sessizce bitir)
  if (data._hp && data._hp.trim() !== "") {
    return new NextResponse(null, { status: 204 });
  }

  // 3) Tarih doğrulama (start < end)
  const start = isoDateToUtcDate(data.startDate);
  const end = isoDateToUtcDate(data.endDate);
  if (!start || !end || start >= end) {
    return NextResponse.json({ error: "Geçersiz tarih aralığı" }, { status: 400 });
  }

  // 4) Ortak env kontrolleri
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing");
    return NextResponse.json(
      { error: "Email provider API key is not configured (RESEND_API_KEY)." },
      { status: 500 },
    );
  }
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const from = process.env.RESEND_FROM || "Villa Portal <onboarding@resend.dev>";
  let to = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (to.length === 0) {
    to = ["delivered@resend.dev"]; // Resend test alıcısı
  }

  const supabase = createServiceRoleClient();

  // Not: adults/children ve mesajı notes alanına özetleyerek yazıyoruz
  const notesParts = [
    data.message ? `Mesaj: ${data.message}` : null,
    data.adults != null ? `Yetişkin: ${data.adults}` : null,
    data.children != null ? `Çocuk: ${data.children}` : null,
  ].filter(Boolean);
  const notes = notesParts.join(" | ") || null;

  const { data: inserted, error: insErr } = await supabase.rpc("create_reservation", {
    p_villa_id: data.villaId,
    p_checkin: data.startDate,
    p_checkout: data.endDate,
    p_guest_name: data.name,
    p_guest_phone: data.phone,
    p_guest_email: data.email,
    p_notes: notes,
    p_status: "pending",
  });

  if (insErr || !inserted || typeof inserted !== "object" || !("reservation_id" in inserted)) {
    console.error("Reservation insert error:", insErr);
    return NextResponse.json(
      { error: reservationRpcErrorMessage(insErr) },
      { status: reservationRpcErrorStatus(insErr) },
    );
  }

  const reservationId = String(inserted.reservation_id);

  // 6) Admin’e e-posta: buton “Bekleyen rezervasyonlar” sayfasına götürsün
  //    Odaklanma için query param ekliyoruz (UI bu paramı opsiyonel kullanabilir)
  const adminUrl = `${siteBase}/admin/reservations/pending?focus=${reservationId}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data: sent, error } = await resend.emails.send({
      from,
      to,
      subject: `Ön Rezervasyon: ${data.villaName} (${data.startDate} → ${data.endDate})`,
      replyTo: data.email,
      // ⚠️ Email şablonunda "buttonLabel" opsiyonel prop’unu destekleyin (aşağıda not var)
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
        adminUrl,
        siteUrl: siteBase,
        buttonLabel: "Bekleyen rezervasyonlar", // <— yeni metin
      }),
    });

    if (error) {
      console.error("Resend send error:", error);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    // (İsteğe bağlı) email_logs’a da yazmak isterseniz burada insert edebilirsiniz.

    return NextResponse.json({ ok: true, id: sent?.id, reservationId });
  } catch (err: unknown) {
    console.error("Resend unexpected error:", err);
    return NextResponse.json({ error: getErrorMessage(err, "Email send failed") }, { status: 500 });
  }
}
