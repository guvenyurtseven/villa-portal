import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminVillasPage({
  searchParams,
}: {
  // Next 15: Promise!
  searchParams: Promise<SearchParams>;
}) {
  // Arama parametresini oku
  const sp = await searchParams;
  const qRaw = typeof sp?.q === "string" ? sp.q : Array.isArray(sp?.q) ? sp.q[0] : "";
  const q = (qRaw || "").trim();
  const nameKey = q.toLowerCase();
  const refKey = q.replace(/^#/, "").toLowerCase(); // "#AB123" -> "ab123"

  // Service role client kullanarak villaları al (gizli olanlar dahil)
  const supabase = createServiceRoleClient();

  // Temel select (mevcut alanlar + foto alias)
  let query = supabase.from("villas").select(
    `
      *,
      photos:villa_photos(url, is_primary)
    `,
  );

  // q varsa: isim içinde arama + referans prefix
  if (q) {
    const parts: string[] = [];
    if (nameKey) parts.push(`name.ilike.%${nameKey}%`);
    if (refKey) parts.push(`reference_code.ilike.${refKey}%`);
    if (parts.length) {
      query = query.or(parts.join(","));
    }
  }

  // Sıralama: en yeni üstte (mevcut davranış)
  const { data: villas, error } = await query.order("created_at", {
    ascending: false,
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-8 gap-3">
        <div>
          <h1 className="text-3xl font-bold">Villalar</h1>
          {q && (
            <p className="text-sm text-muted-foreground mt-1">
              Arama: <span className="font-medium">“{q}”</span>
            </p>
          )}
        </div>

        {/* Arama formu (aynı sayfada kalır, GET ile filtreler) */}
        <form action="/admin/villas" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Villa adı veya #REFKOD"
            className="h-9 w-64 rounded border px-3 text-sm"
          />
          <button
            type="submit"
            className="h-9 px-4 rounded bg-orange-500 hover:bg-orange-600 text-white text-sm"
          >
            Ara
          </button>
          {q && (
            <Link
              href="/admin/villas"
              className="h-9 px-3 rounded border text-sm hover:bg-muted text-center items-center flex"
            >
              Temizle
            </Link>
          )}
          <Button asChild className="ml-2">
            <Link href="/admin/villas/new">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Villa Ekle
            </Link>
          </Button>
        </form>
      </div>

      {villas && villas.length > 0 ? (
        <div className="grid gap-4">
          {villas.map((villa: any) => {
            // Birincil fotoğrafı bul (is_primary öncelik, yoksa ilk)
            const primaryPhoto =
              villa.photos?.find((p: any) => p.is_primary)?.url ||
              villa.photos?.[0]?.url ||
              "/placeholder.jpg";

            return (
              <Card key={villa.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {/* Villa Fotoğrafı */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <Image
                          src={primaryPhoto}
                          alt={villa.name}
                          className="w-full h-full object-cover rounded-lg"
                          width={96}
                          height={96}
                          unoptimized
                        />
                      </div>

                      {/* Villa Bilgileri */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{villa.name}</h3>
                          {/* Gizli Durumu Badge */}
                          {villa.is_hidden ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <EyeOff className="h-3 w-3" />
                              Gizli
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                              <Eye className="h-3 w-3" />
                              Yayında
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {villa.bedrooms} Yatak • {villa.bathrooms} Banyo
                            {villa.has_pool && " • Havuz"}
                            {villa.capacity && ` • ${villa.capacity} Kişi`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/villas/${villa.id}/calendar`}>Takvim</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/villas/${villa.id}/edit`}>Düzenle</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500 mb-4">
              {q ? "Arama kriterlerinize uygun villa bulunamadı." : "Henüz villa eklenmemiş."}
            </p>
            <Button asChild>
              <Link href="/admin/villas/new">
                <Plus className="h-4 w-4 mr-2" />
                İlk Villayı Ekle
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
