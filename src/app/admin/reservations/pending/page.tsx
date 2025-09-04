// src/app/admin/reservations/pending/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingReservationCard from "@/components/admin/pending/PendingReservationCard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Record<string, string | string[] | undefined>;

function parsePGRange(range: string | null | undefined) {
  if (!range) return null;
  // "[YYYY-MM-DD,YYYY-MM-DD)" şekli
  const m = /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})\)/.exec(range);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

function formatTr(d: string) {
  try {
    return new Date(d + "T00:00:00Z").toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default async function PendingReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const focusId = typeof sp?.focus === "string" ? sp.focus : undefined;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, villa_id, date_range, guest_name, guest_email, guest_phone, notes, created_at,
      villa:villas(name,
        photos:villa_photos(url, is_primary, order_index)
      )
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Bekleyen Rezervasyonlar</h1>
        <Card>
          <CardContent className="p-6 text-red-600">
            Yüklenirken bir hata oluştu: {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = (data ?? []).map((r: any) => {
    const photos = Array.isArray(r.villa?.photos) ? r.villa.photos.slice() : [];
    photos.sort(
      (a: any, b: any) =>
        (b.is_primary ? 0 : 1) - (a.is_primary ? 0 : 1) ||
        (a.order_index ?? 999) - (b.order_index ?? 999),
    );
    const coverUrl = photos[0]?.url ?? null;
    const parsed = parsePGRange(r.date_range);
    return {
      id: r.id,
      villaId: r.villa_id as string,
      villaName: r.villa?.name ?? "-",
      guestName: r.guest_name ?? "-",
      createdAt: r.created_at as string | null,
      dateText: parsed ? `${formatTr(parsed.start)} → ${formatTr(parsed.end)}` : "-",
      coverUrl,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bekleyen Rezervasyonlar</h1>
        <Button asChild variant="outline">
          <Link href="/admin/villas">Villalara Dön</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-gray-600">
            Şu anda bekleyen bir rezervasyon bulunmuyor.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((it) => (
            <PendingReservationCard
              key={it.id}
              id={it.id}
              villaName={it.villaName}
              guestName={it.guestName}
              dateText={it.dateText}
              coverUrl={it.coverUrl ?? undefined}
              highlight={focusId === it.id}
              href={`/admin/reservations/pending/${it.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
