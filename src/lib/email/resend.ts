// src/lib/email/resend.ts  (veya projende uygun gördüğün mevcut dosya)
import { Resend } from "resend";
import { MAIL_FROM, SITE_URL } from "@/lib/email/config";

export const resend = new Resend(process.env.RESEND_API_KEY!);
export { MAIL_FROM, SITE_URL };
