import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import OwnerReservationEmail from "@/emails/OwnerReservationEmail";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { formatTRYOptional } from "@/lib/formatters";
import { parsePgDateRangeDatesOrNow } from "@/lib/pgRange";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };
type ApprovalResult = { total_price?: number | string | null };

const RESEND = new Resend(process.env.RESEND_API_KEY || "");
const MAIL_FROM = process.env.RESEND_FROM ?? "noreply@example.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function PATCH(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id eksik" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const force = new URL(req.url).searchParams.get("force") === "1";

  const { data: reservation, error: reservationError } = await supabase
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
    .eq("id", id)
    .single();

  if (reservationError || !reservation) {
    return NextResponse.json(
      { error: reservationError?.message || "Rezervasyon bulunamadi" },
      { status: 404 },
    );
  }

  const villa = Array.isArray(reservation.villa) ? reservation.villa[0] : reservation.villa;
  const owner = Array.isArray(villa?.owner) ? villa.owner[0] : villa?.owner;

  if (!villa?.id || !owner?.id || !owner?.email) {
    return NextResponse.json({ error: "Villa sahibi bilgileri eksik." }, { status: 400 });
  }

  let totalPrice = reservation.total_price;

  if (reservation.status === "pending") {
    const { data: approval, error: rpcError } = await supabase.rpc("approve_pending_reservation", {
      p_id: id,
    });
    if (rpcError) {
      return NextResponse.json(
        { error: `Onay basarisiz: ${rpcError.message}` },
        { status: 500 },
      );
    }

    totalPrice = (approval as ApprovalResult | null)?.total_price ?? totalPrice;
  } else if (reservation.status !== "confirmed") {
    return NextResponse.json(
      { error: `Rezervasyon onaylanabilir durumda degil: ${reservation.status ?? "unknown"}` },
      { status: 409 },
    );
  }

  if (reservation.owner_notified_at && !force) {
    return NextResponse.json({ ok: true, info: "Daha once bilgilendirildi" });
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
    return NextResponse.json(
      { error: tokenError?.message || "Token uretilemedi" },
      { status: 500 },
    );
  }

  const ctaUrl = `${SITE_URL}/giris-bilgilendirme/${villa.id}/evsahibi?t=${tokenRow.token}`;

  try {
    const emailReact = OwnerReservationEmail({
      villaName: villa.name,
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

    const { error: mailError } = await RESEND.emails.send({
      from: MAIL_FROM,
      to: [owner.email],
      subject: `Rezervasyon onaylandi - ${villa.name}`,
      react: emailReact,
    });

    if (mailError) {
      return NextResponse.json(
        { error: `Mail gonderilemedi: ${mailError.message}` },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: `Mail gonderilemedi: ${message}` }, { status: 502 });
  }

  await supabase
    .from("reservations")
    .update({ owner_notified_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
