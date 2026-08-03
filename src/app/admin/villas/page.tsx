// src/app/admin/villas/page.tsx
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { OwnerIdFilter } from "@/components/admin/OwnerIdFilter";

type SearchParams = Record<string, string | string[] | undefined>;
type VillaPhotoRow = {
  url: string | null;
  is_primary: boolean | null;
};

type VillaOwnerRow = {
  id?: string;
  full_name?: string | null;
};

type VillaListRow = {
  id: string;
  name: string;
  bedrooms: number | null;
  bathrooms: number | null;
  has_pool: boolean | null;
  capacity: number | null;
  is_hidden: boolean | null;
  owner?: VillaOwnerRow | null;
  photos?: VillaPhotoRow[] | null;
};

// Basit UUID doğrulayıcı (v4'e kısıtlamadan genel UUID biçimi)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminVillasPage({
  searchParams,
}: {
  // Next 15: Promise!
  searchParams: Promise<SearchParams>;
}) {
  // Arama parametrelerini oku (Next 15: await zorunlu)
  const sp = await searchParams;

  const qRaw = typeof sp?.q === "string" ? sp.q : Array.isArray(sp?.q) ? sp.q[0] : "";
  const q = (qRaw || "").trim();
  const nameKey = q.toLowerCase();
  const refKey = q.replace(/^#/, "").toLowerCase(); // "#AB123" -> "ab123"

  const ownerIdRaw =
    typeof sp?.owner_id === "string"
      ? sp.owner_id
      : Array.isArray(sp?.owner_id)
        ? sp.owner_id[0]
        : "";
  const ownerId = (ownerIdRaw || "").trim();
  const isUuid = UUID_REGEX.test(ownerId);

  // Service role client ile villaları al (gizliler dahil)
  const supabase = createServiceRoleClient();

  // İlişkisel seçim: owners ve villa_photos
  // (PostgREST/Supabase nested select ile FK üzerinden ilişki okunur)
  let query = supabase.from("villas").select(
    `
      *,
      owner:owners(id, full_name),
      photos:villa_photos(url, is_primary)
    `,
  );

  // q varsa: isim içinde arama + referans prefix
  if (q) {
    const parts: string[] = [];
    if (nameKey) parts.push(`name.ilike.%${nameKey}%`);
    if (refKey) parts.push(`reference_code.ilike.${refKey}%`);
    if (parts.length) {
      // or(): PostgREST raw syntax – birden fazla filtreyi OR’lar
      query = query.or(parts.join(","));
    }
  }

  // owner_id ile filtre (sadece UUID ise uygula)
  if (ownerId && isUuid) {
    query = query.eq("owner_id", ownerId);
  }

  // Sıralama: en yeni üstte (mevcut davranış)
  const { data: villas, error } = await query.order("created_at", {
    ascending: false,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Villalar</h1>
          {(q || ownerId) && (
            <p className="text-sm text-muted-foreground mt-1">
              {q && (
                <>
                  Arama: <span className="font-medium">“{q}”</span>
                </>
              )}
              {q && ownerId ? " • " : null}
              {ownerId && (
                <>
                  Sahip ID: <span className="font-medium">{ownerId}</span>
                  {!isUuid && (
                    <>
                      {" "}
                      <span className="text-red-600">
                        (Geçerli UUID değil — filtre uygulanmadı)
                      </span>
                    </>
                  )}
                </>
              )}
            </p>
          )}
        </div>

        {/* Filtreler (GET formu) */}
        <FilterBar defaultQ={q} defaultOwnerId={isUuid ? ownerId : ""} />
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-center text-red-600">
            Liste alınamadı: {error.message}
          </CardContent>
        </Card>
      ) : villas && villas.length > 0 ? (
        <div className="grid gap-4">
          {((villas ?? []) as VillaListRow[]).map((villa) => {
            // Birincil fotoğrafı bul (is_primary öncelik, yoksa ilk)
            const primaryPhoto =
              villa.photos?.find((p) => p.is_primary)?.url ||
              villa.photos?.[0]?.url ||
              "/placeholder.jpg";

            const owner = villa.owner;

            return (
              <Card key={villa.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
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
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="min-w-0 max-w-full break-all text-lg font-semibold">
                            {villa.name}
                          </h3>
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

                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>
                            {villa.bedrooms} Yatak • {villa.bathrooms} Banyo
                            {villa.has_pool && " • Havuz"}
                            {villa.capacity && ` • ${villa.capacity} Kişi`}
                          </span>
                        </div>

                        {/* Yeni: Sahip bilgisi */}
                        <div className="mt-1 text-sm">
                          Sahip:{" "}
                          {owner?.id ? (
                            <Link
                              href={`/admin/owners/${owner.id}/edit`}
                              className="break-all underline"
                            >
                              {owner.full_name || "—"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex flex-wrap gap-2 sm:justify-end">
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
              {q || ownerId
                ? "Arama kriterlerinize uygun villa bulunamadı."
                : "Henüz villa eklenmemiş."}
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

function FilterBar({ defaultQ, defaultOwnerId }: { defaultQ?: string; defaultOwnerId?: string }) {
  const formId = "villa-filters";

  return (
    <form
      id={formId}
      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
      action="/admin/villas"
      method="get"
    >
      <input
        type="text"
        name="q"
        defaultValue={defaultQ}
        placeholder="Villa adı veya #REFKOD"
        className="h-9 w-full rounded border px-3 text-sm sm:w-64"
      />

      {/* Dropdown ile exact sahip filtresi */}
      <div className="w-full sm:w-64">
        <OwnerIdFilter
          defaultOwnerId={defaultOwnerId}
          autosubmit={false} // true yaparsan seçimde otomatik gönderir
          formId={formId}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full sm:w-auto"
      >
        Ara
      </Button>

      <Link
        href="/admin/villas"
        className="flex h-9 w-full items-center justify-center rounded border px-3 text-center text-sm hover:bg-muted sm:w-auto"
      >
        Temizle
      </Link>
    </form>
  );
}
