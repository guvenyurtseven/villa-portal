import Link from "next/link";
import { Archive, Inbox, Mail, MailOpen, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MAIL_INBOX_ADDRESS } from "@/lib/email/config";
import { createServiceRoleClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ status?: string; q?: string }>;

type InboxRow = {
  id: string;
  from_email: string;
  to_emails: string[];
  subject: string | null;
  preview: string | null;
  status: "unread" | "read" | "archived";
  received_at: string;
};

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "unread", label: "Okunmamis" },
  { value: "read", label: "Okunmus" },
  { value: "archived", label: "Arsiv" },
] as const;

function statusBadge(status: InboxRow["status"]) {
  if (status === "unread") return <Badge variant="default">Okunmamis</Badge>;
  if (status === "archived") return <Badge variant="secondary">Arsiv</Badge>;
  return <Badge variant="outline">Okunmus</Badge>;
}

export default async function AdminEmailInboxPage({ searchParams }: { searchParams: SearchParams }) {
  const { status = "active", q = "" } = await searchParams;
  const queryText = q.trim();
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("email_inbox_messages")
    .select("id, from_email, to_emails, subject, preview, status, received_at")
    .order("received_at", { ascending: false })
    .limit(100);

  if (status === "unread" || status === "read" || status === "archived") {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "archived");
  }

  if (queryText) {
    query = query.or(
      `from_email.ilike.%${queryText}%,subject.ilike.%${queryText}%,preview.ilike.%${queryText}%`,
    );
  }

  const { data, error } = await query;
  const messages = (data ?? []) as InboxRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Inbox className="h-7 w-7 text-orange-600" />
            Email Inbox
          </h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Gelen maillerin hedef adresi: <span className="font-medium">{MAIL_INBOX_ADDRESS}</span>
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={queryText}
            placeholder="Gonderen, konu veya icerikte ara"
            className="h-10 w-full rounded-md border px-9 text-sm"
          />
        </div>
        <select name="status" defaultValue={status} className="h-10 rounded-md border px-3 text-sm">
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary">
          Ara
        </Button>
      </form>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-red-600">Inbox yuklenemedi: {error.message}</CardContent>
        </Card>
      ) : messages.length > 0 ? (
        <div className="grid gap-3">
          {messages.map((message) => (
            <Link
              key={message.id}
              href={`/admin/email-inbox/${message.id}`}
              className="block rounded-lg border bg-white p-4 transition hover:border-orange-200 hover:shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    {message.status === "unread" ? (
                      <Mail className="h-4 w-4 shrink-0 text-orange-600" />
                    ) : message.status === "archived" ? (
                      <Archive className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <MailOpen className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <p className="min-w-0 break-words font-semibold">
                      {message.subject || "(Konu yok)"}
                    </p>
                  </div>
                  <p className="mt-1 min-w-0 break-words text-sm text-slate-700">
                    {message.from_email}
                  </p>
                  {message.preview && (
                    <p className="mt-2 line-clamp-2 break-words text-sm text-slate-500">
                      {message.preview}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 text-left text-xs text-slate-500 sm:items-end sm:text-right">
                  {statusBadge(message.status)}
                  <time dateTime={message.received_at}>
                    {new Date(message.received_at).toLocaleString("tr-TR")}
                  </time>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            Bu filtrelerle gosterilecek mail yok.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
