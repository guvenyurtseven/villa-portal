// src/lib/email/send-owner-reservation.ts
import { resend, MAIL_FROM } from "@/lib/email/resend";
import OwnerReservationEmail from "@/emails/OwnerReservationEmail";

type SendOwnerReservationArgs = {
  to: string; // owner.email
  villaName: string;
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  checkinStr: string; // TR formatlı string
  checkoutStr: string; // TR formatlı string
  nights: number;
  totalPriceStr: string;
  cleaningFeeStr?: string;
  depositStr?: string;
  ctaUrl: string; // /giris-bilgilendirme/... ?t=TOKEN
};

export async function sendOwnerReservationEmail(args: SendOwnerReservationArgs) {
  const emailReact = OwnerReservationEmail({
    villaName: args.villaName,
    guestName: args.guestName,
    guestPhone: args.guestPhone ?? undefined,
    guestEmail: args.guestEmail ?? undefined,
    checkinStr: args.checkinStr,
    checkoutStr: args.checkoutStr,
    nights: args.nights,
    totalPriceStr: args.totalPriceStr,
    cleaningFeeStr: args.cleaningFeeStr,
    depositStr: args.depositStr,
    ctaUrl: args.ctaUrl,
  });

  const { error } = await resend.emails.send({
    from: MAIL_FROM,
    to: [args.to],
    subject: `Rezervasyon onaylandı — ${args.villaName}`,
    react: emailReact, // React Email bileşeniyle gönderim
  });

  if (error) throw new Error(error.message);
}
