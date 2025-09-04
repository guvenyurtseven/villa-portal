// src/app/admin/reservations/pending/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingReservationActions from "@/components/admin/pending/PendingReservationActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePGRange(range: string | null | undefined) {
  if (!range) return null;
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

export default async function PendingReservationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, villa_id, date_range, guest_name, guest_email, guest_phone, total_price, notes, created_at,
      villa:villas(name,
        photos:villa_photos(url, is_primary, order_index)
      )
    `,
    )
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Bekleyen Rezervasyon</h1>
        <Card>
          <CardContent className="p-6 text-red-600">
            Kayıt bulunamadı veya işlenmiş olabilir.
          </CardContent>
        </Card>
        <Button asChild variant="outline">
          <Link href="/admin/reservations/pending">Listeye Dön</Link>
        </Button>
      </div>
    );
  }

  const photos = Array.isArray(data.villa?.photos) ? data.villa.photos.slice() : [];
  photos.sort(
    (a: any, b: any) =>
      (b.is_primary ? 0 : 1) - (a.is_primary ? 0 : 1) ||
      (a.order_index ?? 999) - (b.order_index ?? 999),
  );
  const coverUrl = photos[0]?.url ?? null;
  const parsed = parsePGRange(data.date_range);
  const dateText = parsed ? `${formatTr(parsed.start)} → ${formatTr(parsed.end)}` : "-";

  return (
    <div className="space-y-6">
      {/* Üst kısım: Villa adı ve kapak */}
      <div className="flex gap-4 items-start">
        <div className="relative w-40 h-28 rounded overflow-hidden border bg-muted/30">
          <Image
            src={coverUrl || "/placeholder.jpg"}
            alt={data.villa?.name || "Villa"}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.villa?.name ?? "Villa"}</h1>
          <p className="text-sm text-gray-600">{dateText}</p>
          <div className="mt-2 flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/reservations/pending">Listeye Dön</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/villas/${data.villa_id}/calendar`}>Takvim</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Detaylar */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Misafir Adı</p>
              <p className="font-medium">{data.guest_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">E-posta</p>
              <p className="font-medium">{data.guest_email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Telefon</p>
              <p className="font-medium">{data.guest_phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Fiyat</p>
              <p className="font-medium">
                {data.total_price != null ? `${data.total_price} ₺` : "-"}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Tarih Aralığı</p>
              <p className="font-medium">{dateText}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Notlar</p>
              <p className="font-medium whitespace-pre-wrap">{data.notes || "-"}</p>
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="pt-2 border-t mt-2">
            <PendingReservationActions reservationId={data.id} villaId={data.villa_id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
