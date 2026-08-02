// src/app/admin/reservations/pending/page.tsx
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingReservationCard from "@/components/admin/pending/PendingReservationCard";
import { getVillaCoverUrl } from "@/domain/villas/PhotoSorting";
import { displayPgDateRangeCheckoutShort } from "@/lib/pgRange";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Record<string, string | string[] | undefined>;
type RelationOne<T> = T | T[] | null | undefined;
type PendingReservationRow = {
  id: string;
  villa_id: string | null;
  date_range: string | null;
  guest_name: string | null;
  created_at: string | null;
  villa?: RelationOne<{
    name: string | null;
    photos?: { url: string | null; is_primary: boolean | null; order_index: number | null }[] | null;
  }>;
};

function firstRelation<T>(value: RelationOne<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
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

  const items = ((data ?? []) as PendingReservationRow[]).map((r) => {
    const villa = firstRelation(r.villa);
    const photos = Array.isArray(villa?.photos) ? villa.photos.slice() : [];
    const coverUrl = getVillaCoverUrl(photos);
    return {
      id: r.id,
      villaId: r.villa_id as string,
      villaName: villa?.name ?? "-",
      guestName: r.guest_name ?? "-",
      createdAt: r.created_at as string | null,
      dateText: displayPgDateRangeCheckoutShort(r.date_range) ?? "-",
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
