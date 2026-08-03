import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailInboxActions } from "@/components/admin/email-inbox/EmailInboxActions";
import { createServiceRoleClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

type InboxMessage = {
  id: string;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  received_for: string[];
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  attachments: Array<{ filename?: string | null; content_type?: string | null; size?: number | null }>;
  raw_payload: unknown;
  status: "unread" | "read" | "archived";
  received_at: string;
};

function statusBadge(status: InboxMessage["status"]) {
  if (status === "unread") return <Badge variant="default">Okunmamis</Badge>;
  if (status === "archived") return <Badge variant="secondary">Arsiv</Badge>;
  return <Badge variant="outline">Okunmus</Badge>;
}

function joinEmails(values: string[]) {
  return values.length > 0 ? values.join(", ") : "-";
}

function plainBody(message: InboxMessage) {
  if (message.text_body?.trim()) return message.text_body.trim();
  if (message.html_body?.trim()) return message.html_body.trim();
  return "Mail icerigi webhook metadata'sinda yok. Resend Receiving API erisimi aktifse sonraki gelen mailler text/html icerigiyle kaydedilir.";
}

export default async function AdminEmailInboxDetailPage({ params }: Params) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("email_inbox_messages")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const message = data as InboxMessage;
  if (message.status === "unread") {
    await supabase.from("email_inbox_messages").update({ status: "read" }).eq("id", message.id);
    message.status = "read";
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/email-inbox"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Inboxa don
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="break-words text-2xl">
                {message.subject || "(Konu yok)"}
              </CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {new Date(message.received_at).toLocaleString("tr-TR")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {statusBadge(message.status)}
              <EmailInboxActions messageId={message.id} status={message.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <span className="font-medium text-slate-500">Kimden</span>
              <span className="break-words">{message.from_email}</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <span className="font-medium text-slate-500">Kime</span>
              <span className="break-words">{joinEmails(message.to_emails)}</span>
            </div>
            {message.cc_emails.length > 0 && (
              <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <span className="font-medium text-slate-500">CC</span>
                <span className="break-words">{joinEmails(message.cc_emails)}</span>
              </div>
            )}
            {message.received_for.length > 0 && (
              <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <span className="font-medium text-slate-500">Received for</span>
                <span className="break-words">{joinEmails(message.received_for)}</span>
              </div>
            )}
          </div>

          {message.attachments.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Paperclip className="h-4 w-4" />
                Ekler
              </div>
              <div className="grid gap-2">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="break-words rounded bg-slate-50 p-2 text-sm">
                    {attachment.filename || "isimsiz-ek"}{" "}
                    {attachment.content_type ? `(${attachment.content_type})` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}

          <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-white p-4 text-sm leading-6 text-slate-800">
            {plainBody(message)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
