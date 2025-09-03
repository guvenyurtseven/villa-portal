import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY yok" }, { status: 500 });

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      // Doğrulanmış domeniniz yoksa bu 'from' alanı çalışır:
      from: "Acme <onboarding@resend.dev>",
      to: "delivered@resend.dev", // Teslim simülasyonu — dashboard’da görünür
      subject: "Smoke test",
      text: "If you see this in Resend Dashboard -> Emails, backend OK.",
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 502 });
    }
    // { id: "uuid" } döner
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    console.error("Resend fatal:", e);
    return NextResponse.json({ error: e?.message || "send failed" }, { status: 500 });
  }
}
export async function GET() {
  // Sadece duman testi için GET => POST’u tetikliyoruz
  return POST();
}
