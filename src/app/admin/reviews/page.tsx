import Link from "next/link";
import Image from "next/image";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sortVillaPhotos } from "@/domain/villas/PhotoSorting";

type VillaRow = {
  id: string;
  name: string;
};

type PhotoRow = {
  villa_id: string;
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminReviewsPage() {
  const supabase = createServiceRoleClient();

  // 1) Bekleyen yorumlar: token_used=true ve is_approved=false (veya NULL)
  const { data: pending } = await supabase
    .from("reviews")
    .select("id, villa_id, guest_name, created_at, token_used, is_approved")
    .or("is_approved.is.null,is_approved.eq.false")
    .eq("token_used", true)
    .order("created_at", { ascending: false });

  const items = pending ?? [];
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Yorumları Yönet</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-gray-600">
            Onay bekleyen yorum bulunmuyor.
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2) Toplu villa bilgisi & kapak fotoğrafı
  const villaIds = Array.from(new Set(items.map((r) => r.villa_id).filter(Boolean))) as string[];

  const villasById = new Map<string, VillaRow>();
  if (villaIds.length) {
    const { data: villas } = await supabase.from("villas").select("id, name").in("id", villaIds);
    (villas ?? []).forEach((v) => villasById.set(v.id, v));
  }

  const coverByVilla = new Map<string, string>();
  if (villaIds.length) {
    const { data: photos } = await supabase
      .from("villa_photos")
      .select("villa_id, url, is_primary, order_index")
      .in("villa_id", villaIds);

    sortVillaPhotos((photos ?? []) as PhotoRow[]).forEach((p) => {
        if (!coverByVilla.has(p.villa_id)) coverByVilla.set(p.villa_id, p.url);
      });
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Yorumları Yönet</h1>
      </div>

      <div className="grid gap-4">
        {items.map((r) => {
          const villa = r.villa_id ? villasById.get(r.villa_id) : null;
          const cover = r.villa_id ? coverByVilla.get(r.villa_id) : undefined;
          const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString("tr-TR") : "-";

          return (
            <Link href={`/admin/reviews/${r.id}`} key={r.id} className="block">
              <Card className="hover:shadow transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={cover || "/placeholder.jpg"}
                        alt={villa?.name || "Villa"}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {villa?.name ?? "Bilinmeyen Villa"}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {r.guest_name || "Misafir"} • {dateStr}
                      </p>
                    </div>
                    <div className="w-full sm:ml-auto sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        Detayı aç
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
