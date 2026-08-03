import { Resend } from "resend";
import OwnerReservationEmail from "@/emails/OwnerReservationEmail";
import { MAIL_FROM, SITE_URL } from "@/lib/email/config";
import { getErrorMessage } from "@/lib/errors";
import { formatTRYOptional } from "@/lib/formatters";
import { parsePgDateRangeDatesOrNow } from "@/lib/pgRange";
import type { createServiceRoleClient } from "@/lib/supabase/server";

type SupabaseServiceClient = ReturnType<typeof createServiceRoleClient>;

type ApprovalResult = { total_price?: number | string | null };

type ReservationForApproval = {
  id: string;
  status: string | null;
  date_range: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  total_price: number | string | null;
  owner_notified_at: string | null;
  villa:
    | {
        id: string | null;
        name: string | null;
        cleaning_fee: number | string | null;
        owner:
          | {
              id: string | null;
              full_name: string | null;
              email: string | null;
              phone: string | null;
            }
          | Array<{
              id: string | null;
              full_name: string | null;
              email: string | null;
              phone: string | null;
            }>
          | null;
      }
    | Array<{
        id: string | null;
        name: string | null;
        cleaning_fee: number | string | null;
        owner:
          | {
              id: string | null;
              full_name: string | null;
              email: string | null;
              phone: string | null;
            }
          | Array<{
              id: string | null;
              full_name: string | null;
              email: string | null;
              phone: string | null;
            }>
          | null;
      }>
    | null;
};

export class ReservationApprovalError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "ReservationApprovalError";
  }
}

async function logOwnerNotification(
  supabase: SupabaseServiceClient,
  args: {
    recipient: string;
    villaId: string;
    reservationId: string;
    status: "sent" | "failed";
    externalId?: string | null;
    errorMessage?: string | null;
  },
) {
  const { error } = await supabase.from("email_logs").insert({
    recipient: args.recipient,
    email_type: "owner_reservation_notification",
    villa_id: args.villaId,
    reservation_id: args.reservationId,
    external_id: args.externalId ?? null,
    sent_at: args.status === "sent" ? new Date().toISOString() : null,
    status: args.status,
    error_message: args.errorMessage ?? null,
  });

  if (error) console.error("owner notification email log failed:", error);
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function approveReservationAndNotifyOwner(
  supabase: SupabaseServiceClient,
  reservationId: string,
  options: { force?: boolean } = {},
) {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, status, date_range, guest_name, guest_email, guest_phone, total_price, owner_notified_at,
      villa:villas(
        id, name, cleaning_fee,
        owner:owners(id, full_name, email, phone)
      )
    `,
    )
    .eq("id", reservationId)
    .single();

  const reservation = data as ReservationForApproval | null;
  if (error || !reservation) {
    throw new ReservationApprovalError(error?.message || "Rezervasyon bulunamadi", 404);
  }

  const villa = firstRelation(reservation.villa);
  const owner = firstRelation(villa?.owner);
  if (!villa?.id || !owner?.id || !owner?.email) {
    throw new ReservationApprovalError("Villa sahibi bilgileri eksik.", 400);
  }

  let totalPrice = reservation.total_price;
  if (reservation.status === "pending") {
    const { data: approval, error: rpcError } = await supabase.rpc("approve_pending_reservation", {
      p_id: reservationId,
    });

    if (rpcError) {
      throw new ReservationApprovalError(`Onay basarisiz: ${rpcError.message}`, 409);
    }

    totalPrice = (approval as ApprovalResult | null)?.total_price ?? totalPrice;
  } else if (reservation.status !== "confirmed") {
    throw new ReservationApprovalError(
      `Rezervasyon onaylanabilir durumda degil: ${reservation.status ?? "unknown"}`,
      409,
    );
  }

  if (reservation.owner_notified_at && !options.force) {
    return {
      ok: true,
      reservationId,
      notificationStatus: "already_sent" as const,
      info: "Daha once bilgilendirildi",
    };
  }

  const { startDate, endExclusiveDate, nights } = parsePgDateRangeDatesOrNow(
    String(reservation.date_range || ""),
  );
  const expiresAt = new Date(endExclusiveDate.getTime() + 7 * 86400000).toISOString();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("owner_portal_tokens")
    .insert({
      reservation_id: reservation.id,
      owner_id: owner.id,
      villa_id: villa.id,
      expires_at: expiresAt,
    })
    .select("token")
    .single();

  if (tokenError || !tokenRow) {
    throw new ReservationApprovalError(tokenError?.message || "Token uretilemedi", 500);
  }

  const ctaUrl = `${SITE_URL}/giris-bilgilendirme/${villa.id}/evsahibi?t=${tokenRow.token}`;

  if (!process.env.RESEND_API_KEY) {
    await logOwnerNotification(supabase, {
      recipient: owner.email,
      villaId: villa.id,
      reservationId,
      status: "failed",
      errorMessage: "RESEND_API_KEY missing",
    });

    return { ok: true, reservationId, notificationStatus: "failed" as const };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailReact = OwnerReservationEmail({
      villaName: villa.name ?? "Villa",
      guestName: reservation.guest_name ?? "Misafir",
      guestPhone: reservation.guest_phone ?? undefined,
      guestEmail: reservation.guest_email ?? undefined,
      checkinStr: startDate.toLocaleDateString("tr-TR"),
      checkoutStr: endExclusiveDate.toLocaleDateString("tr-TR"),
      nights,
      totalPriceStr: formatTRYOptional(Number(totalPrice)) ?? "-",
      cleaningFeeStr: formatTRYOptional(Number(villa.cleaning_fee ?? 0)),
      ctaUrl,
    });

    const { data: sent, error: mailError } = await resend.emails.send({
      from: MAIL_FROM,
      to: [owner.email],
      subject: `Rezervasyon onaylandi - ${villa.name ?? "Villa"}`,
      react: emailReact,
    });

    if (mailError) {
      await logOwnerNotification(supabase, {
        recipient: owner.email,
        villaId: villa.id,
        reservationId,
        status: "failed",
        errorMessage: mailError.message,
      });

      return { ok: true, reservationId, notificationStatus: "failed" as const };
    }

    await supabase
      .from("reservations")
      .update({ owner_notified_at: new Date().toISOString() })
      .eq("id", reservationId);

    await logOwnerNotification(supabase, {
      recipient: owner.email,
      villaId: villa.id,
      reservationId,
      status: "sent",
      externalId: sent?.id ?? null,
    });

    return { ok: true, reservationId, notificationStatus: "sent" as const };
  } catch (error: unknown) {
    await logOwnerNotification(supabase, {
      recipient: owner.email,
      villaId: villa.id,
      reservationId,
      status: "failed",
      errorMessage: getErrorMessage(error, "Mail gonderilemedi"),
    });

    return { ok: true, reservationId, notificationStatus: "failed" as const };
  }
}
