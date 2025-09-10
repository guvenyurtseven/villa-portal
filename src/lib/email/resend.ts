// src/lib/email/resend.ts  (veya projende uygun gördüğün mevcut dosya)
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);
export const MAIL_FROM = process.env.RESEND_FROM ?? "noreply@example.com";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
