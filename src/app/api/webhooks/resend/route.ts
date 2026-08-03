import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: Record<string, unknown>;
};

type ReceivedEmailContent = {
  id?: string;
  created_at?: string;
  from?: string;
  to?: string[];
  cc?: string[] | null;
  bcc?: string[] | null;
  received_for?: string[];
  subject?: string;
  message_id?: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string> | null;
  attachments?: unknown[] | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function firstText(value: string | null | undefined, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function truncatePreview(value: string | null | undefined) {
  return firstText(value).replace(/\s+/g, " ").slice(0, 240);
}

async function verifyOrParseEvent(req: NextRequest, payload: string) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const webhook = new Webhook(webhookSecret);
    return webhook.verify(payload, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as unknown as ResendWebhookEvent;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  }

  return JSON.parse(payload) as ResendWebhookEvent;
}

async function fetchReceivedEmail(emailId: string) {
  if (!emailId || !process.env.RESEND_API_KEY) return null;

  const response = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`,
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Resend received email content fetch failed:", response.status);
    return null;
  }

  return (await response.json()) as ReceivedEmailContent | null;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  let event: ResendWebhookEvent;

  try {
    event = await verifyOrParseEvent(req, payload);
  } catch (error) {
    console.error("Resend webhook verification failed:", error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const rawData = event.data ?? {};
  const providerEventId = req.headers.get("svix-id") || null;
  const emailId = asString(rawData.email_id || rawData.id);
  const content = await fetchReceivedEmail(emailId);

  const fromEmail = firstText(content?.from, asString(rawData.from));
  const toEmails = content?.to ?? asStringArray(rawData.to);
  const ccEmails = content?.cc ?? asStringArray(rawData.cc);
  const bccEmails = content?.bcc ?? asStringArray(rawData.bcc);
  const receivedFor = content?.received_for ?? asStringArray(rawData.received_for);
  const textBody = content?.text ?? null;
  const htmlBody = content?.html ?? null;
  const subject = firstText(content?.subject, asString(rawData.subject)) || null;
  const receivedAt = firstText(content?.created_at, asString(rawData.created_at || event.created_at));
  const attachments = content?.attachments ?? rawData.attachments ?? [];
  const rawPayload = JSON.parse(payload);

  const supabase = createServiceRoleClient();

  let existingId: string | null = null;
  if (emailId) {
    const { data } = await supabase
      .from("email_inbox_messages")
      .select("id")
      .eq("provider_email_id", emailId)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (!existingId && providerEventId) {
    const { data } = await supabase
      .from("email_inbox_messages")
      .select("id")
      .eq("provider_event_id", providerEventId)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  const row = {
    provider: "resend",
    provider_event_id: providerEventId,
    provider_email_id: emailId || null,
    message_id: firstText(content?.message_id, asString(rawData.message_id)) || null,
    from_email: fromEmail,
    to_emails: toEmails,
    cc_emails: ccEmails ?? [],
    bcc_emails: bccEmails ?? [],
    received_for: receivedFor,
    subject,
    preview: truncatePreview(textBody || subject),
    text_body: textBody,
    html_body: htmlBody,
    headers: content?.headers ?? {},
    attachments,
    raw_payload: rawPayload,
    received_at: receivedAt || new Date().toISOString(),
  };

  const result = existingId
    ? await supabase.from("email_inbox_messages").update(row).eq("id", existingId).select("id").single()
    : await supabase.from("email_inbox_messages").insert(row).select("id").single();

  if (result.error) {
    console.error("Inbound email store failed:", result.error);
    return NextResponse.json({ error: "Email kaydedilemedi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.data.id });
}
