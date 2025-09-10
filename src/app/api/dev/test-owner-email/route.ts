// src/app/api/dev/test-owner-mail/route.ts
import { NextResponse } from "next/server";
import { sendOwnerReservationEmail } from "@/lib/email/send-owner-reservation";

export const runtime = "nodejs";

export async function POST() {
  try {
    await sendOwnerReservationEmail({
      to: "ggvnyurtseven@gmail.com",
      villaName: "Test Villa",
      guestName: "Test Misafir",
      checkinStr: "10.09.2025",
      checkoutStr: "12.09.2025",
      nights: 2,
      totalPriceStr: "₺10.000",
      cleaningFeeStr: "₺0",
      ctaUrl: "https://example.com/giris-bilgilendirme/xxx/evsahibi?t=TEST",
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
