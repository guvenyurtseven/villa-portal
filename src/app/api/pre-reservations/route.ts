import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import PreReservationEmail from "@/emails/PreReservationEmail";
import {
  reservationRpcErrorMessage,
  reservationRpcErrorStatus,
} from "@/domain/reservations/ReservationApiErrors";
import {
  ADMIN_NOTIFICATION_RECIPIENTS,
  MAIL_FROM,
  MAIL_INBOX_ADDRESS,
  SITE_URL,
} from "@/lib/email/config";
import { getErrorMessage } from "@/lib/errors";
import { isoDateToUtcDate } from "@/lib/pgRange";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  villaId: z.string().uuid(),
  villaName: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7, "Gecerli bir telefon girin"),
  adults: z.coerce.number().int().min(1).optional(),
  children: z.coerce.number().int().min(0).optional(),
  message: z.string().max(2000).optional(),
  _hp: z.string().optional(),
});

async function logPreReservationEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  recipients: string[],
  args: {
    villaId: string;
    reservationId: string;
    status: "sent" | "failed";
    externalId?: string | null;
    errorMessage?: string | null;
  },
) {
  const rows = recipients.map((recipient) => ({
    recipient,
    email_type: "pre_reservation_admin_notification",
    villa_id: args.villaId,
    reservation_id: args.reservationId,
    external_id: args.externalId ?? null,
    sent_at: args.status === "sent" ? new Date().toISOString() : null,
    status: args.status,
    error_message: args.errorMessage ?? null,
  }));

  const { error } = await supabase.from("email_logs").insert(rows);
  if (error) console.error("pre-reservation email log failed:", error);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data._hp && data._hp.trim() !== "") {
    return new NextResponse(null, { status: 204 });
  }

  const start = isoDateToUtcDate(data.startDate);
  const end = isoDateToUtcDate(data.endDate);
  if (!start || !end || start >= end) {
    return NextResponse.json({ error: "Gecersiz tarih araligi" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const notesParts = [
    data.message ? `Mesaj: ${data.message}` : null,
    data.adults != null ? `Yetiskin: ${data.adults}` : null,
    data.children != null ? `Cocuk: ${data.children}` : null,
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
  const recipients =
    ADMIN_NOTIFICATION_RECIPIENTS.length > 0 ? ADMIN_NOTIFICATION_RECIPIENTS : [MAIL_INBOX_ADDRESS];

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing; reservation was created without email notification");
    await logPreReservationEmail(supabase, recipients, {
      villaId: data.villaId,
      reservationId,
      status: "failed",
      errorMessage: "RESEND_API_KEY missing",
    });

    return NextResponse.json({ ok: true, reservationId, notificationStatus: "failed" });
  }

  const adminUrl = `${SITE_URL}/admin/reservations/pending?focus=${reservationId}`;
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data: sent, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: recipients,
      subject: `On Rezervasyon: ${data.villaName} (${data.startDate} -> ${data.endDate})`,
      replyTo: data.email,
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
        siteUrl: SITE_URL,
        buttonLabel: "Bekleyen rezervasyonlar",
      }),
    });

    if (error) {
      console.error("Resend send error:", error);
      await logPreReservationEmail(supabase, recipients, {
        villaId: data.villaId,
        reservationId,
        status: "failed",
        errorMessage: error.message,
      });

      return NextResponse.json({ ok: true, reservationId, notificationStatus: "failed" });
    }

    await logPreReservationEmail(supabase, recipients, {
      villaId: data.villaId,
      reservationId,
      status: "sent",
      externalId: sent?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      id: sent?.id,
      reservationId,
      notificationStatus: "sent",
    });
  } catch (err: unknown) {
    console.error("Resend unexpected error:", err);
    await logPreReservationEmail(supabase, recipients, {
      villaId: data.villaId,
      reservationId,
      status: "failed",
      errorMessage: getErrorMessage(err, "Email send failed"),
    });

    return NextResponse.json({ ok: true, reservationId, notificationStatus: "failed" });
  }
}
