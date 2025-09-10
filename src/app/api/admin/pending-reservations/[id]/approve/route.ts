// src/app/api/admin/pending-reservations/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import OwnerReservationEmail from "@/emails/OwnerReservationEmail";
import { Resend } from "resend";

export const runtime = "nodejs";

const RESEND = new Resend(process.env.RESEND_API_KEY!);
const MAIL_FROM = process.env.RESEND_FROM ?? "noreply@example.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Params = { params: Promise<{ id: string }> };

function formatTRY(n?: number | null) {
  if (typeof n !== "number") return undefined;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

function parseDateRange(range: string) {
  // Beklenen: "[YYYY-MM-DD,YYYY-MM-DD)" gibi
  const m = range?.match(/^\[?(\d{4}-\d{2}-\d{2}).*?,\s*(\d{4}-\d{2}-\d{2})/);
  const start = m ? new Date(m[1] + "T00:00:00Z") : new Date();
  const end = m ? new Date(m[2] + "T00:00:00Z") : new Date();
  const nights = Math.max(1, Math.round((+end - +start) / 86400000));
  return { start, end, nights };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id eksik" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const force = new URL(req.url).searchParams.get("force") === "1";

  // 1) Rezervasyon + villa + owner çek (mail ve token için gerekli tüm veriler)
  const { data: r, error: rErr } = await supabase
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

  if (rErr || !r) {
    return NextResponse.json({ error: rErr?.message || "Rezervasyon bulunamadı" }, { status: 404 });
  }
  if (!r.villa?.id || !r.villa?.owner?.id || !r.villa?.owner?.email) {
    return NextResponse.json({ error: "Villa sahibi bilgileri eksik." }, { status: 400 });
  }

  // 2) Zaten approved değilse: accept_pending_reservation RPC’si ile onayla
  if (r.status !== "approved") {
    const { error: rpcErr } = await supabase.rpc("approve_pending_reservation", {
      p_id: id,
    });
    if (rpcErr) {
      return NextResponse.json({ error: `Onay başarısız: ${rpcErr.message}` }, { status: 500 });
    }
  }

  // owner'a daha önce mail gittiyse ve force değilse yeniden göndermeyelim
  if (r.owner_notified_at && !force) {
    return NextResponse.json({ ok: true, info: "Daha önce bilgilendirilmiş" });
  }

  // 3) Token üret (checkout + 7 gün geçerli)
  const { start, end, nights } = parseDateRange(String(r.date_range || ""));
  const expiresAt = new Date(+end + 7 * 86400000).toISOString();

  const { data: tokenRow, error: tokErr } = await supabase
    .from("owner_portal_tokens")
    .insert({
      reservation_id: r.id,
      owner_id: r.villa.owner.id,
      villa_id: r.villa.id,
      // token sütunu DB default gen_random_uuid() ile üretilecek
      expires_at: expiresAt,
    })
    .select("token")
    .single();

  if (tokErr || !tokenRow) {
    return NextResponse.json({ error: tokErr?.message || "Token üretilemedi" }, { status: 500 });
  }

  const ctaUrl = `${SITE_URL}/giris-bilgilendirme/${r.villa.id}/evsahibi?t=${tokenRow.token}`;

  // 4) E-posta gönder (React Email bileşeni ile)
  try {
    const emailReact = OwnerReservationEmail({
      villaName: r.villa.name,
      guestName: r.guest_name ?? "Misafir",
      guestPhone: r.guest_phone ?? undefined,
      guestEmail: r.guest_email ?? undefined,
      checkinStr: start.toLocaleDateString("tr-TR"),
      checkoutStr: end.toLocaleDateString("tr-TR"),
      nights,
      totalPriceStr: formatTRY(Number(r.total_price)) ?? "—",
      cleaningFeeStr: formatTRY(Number(r.villa.cleaning_fee ?? 0)),
      // depositStr: formatTRY(...), // ileride kolon eklersen kullan
      ctaUrl,
    });

    const { error: mailErr } = await RESEND.emails.send({
      from: MAIL_FROM,
      to: [r.villa.owner.email],
      subject: `Rezervasyon onaylandı — ${r.villa.name}`,
      react: emailReact,
    });

    if (mailErr) {
      return NextResponse.json(
        { error: `Mail gönderilemedi: ${mailErr.message}` },
        { status: 502 },
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Mail gönderilemedi: ${e.message}` }, { status: 502 });
  }

  // 5) owner_notified_at işaretle
  await supabase
    .from("reservations")
    .update({ owner_notified_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
