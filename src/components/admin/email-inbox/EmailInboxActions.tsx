"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, MailOpen, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  messageId: string;
  status: "unread" | "read" | "archived";
};

export function EmailInboxActions({ messageId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"unread" | "read" | "archived" | null>(null);

  async function updateStatus(nextStatus: Props["status"]) {
    if (loading) return;
    setLoading(nextStatus);
    try {
      const res = await fetch(`/api/admin/email-inbox/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Durum guncellenemedi");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Durum guncellenemedi");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "read" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateStatus("read")}
          disabled={loading !== null}
        >
          <MailOpen className="mr-2 h-4 w-4" />
          Okundu
        </Button>
      )}
      {status !== "unread" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateStatus("unread")}
          disabled={loading !== null}
        >
          <MailPlus className="mr-2 h-4 w-4" />
          Okunmadi
        </Button>
      )}
      {status !== "archived" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateStatus("archived")}
          disabled={loading !== null}
        >
          <Archive className="mr-2 h-4 w-4" />
          Arsivle
        </Button>
      )}
    </div>
  );
}
