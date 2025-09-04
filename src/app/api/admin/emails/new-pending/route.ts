// src/app/api/admin/emails/new-pending/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  const payload = await req.json(); // { id, villaName, guestName, dateRangeStr }
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/reservations/pending?focus=${payload.id}`;

  await resend.emails.send({
    from: "Rezervasyon <no-reply@yourdomain.com>",
    to: process.env.ADMIN_EMAIL!,
    subject: `Ön Rezervasyon: ${payload.villaName} – ${payload.dateRangeStr}`,
    react: (
      <div>
        <p><b>{payload.guestName}</b> için yeni ön rezervasyon talebi.</p>
        <a href={url}
           style={{background:'#EF6C00',color:'#fff',padding:'12px 18px',
                   borderRadius:8,textDecoration:'none',display:'inline-block'}}>
          Bekleyen rezervasyonlar
        </a>
      </div>
    )
  });

  return NextResponse.json({ ok: true });
}
