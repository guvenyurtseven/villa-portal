import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs"; // ÖNEMLİ: Resend SDK Node ortamı ister.

export async function GET() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });
  }

  const resend = new Resend(key);

  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@resend.dev>",
    to: ["delivered@resend.dev"],
    subject: "Villa Portal Resend Test",
    html: "<p>it works!</p>",
    replyTo: "onboarding@resend.dev",
  });

  if (error) {
    // Resend hata kodları için: https://resend.com/docs/api-reference/errors
    console.error("Resend error:", error);
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
