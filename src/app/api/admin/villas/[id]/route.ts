// src/app/api/admin/villas/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { FEATURE_KEYS } from "@/domain/villas/FeatureCatalog";
import { sortVillaPhotos } from "@/domain/villas/PhotoSorting";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type PhotoRow = {
  id: string;
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

type CategoryLinkRow = {
  category_id: string;
};

type JsonRecord = Record<string, unknown>;
type VillaUpdate = Database["public"]["Tables"]["villas"]["Update"];
type VillaPhotoInput = {
  id?: unknown;
  url?: unknown;
  is_primary?: unknown;
  order_index?: unknown;
};
type VillaPatchPayload = {
  villa?: unknown;
  photos?: unknown;
  categoryIds?: unknown;
};

function hasOwn<T extends object>(obj: T, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// --- GET (sağlık kontrolü / basit test) ---
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = createServiceRoleClient();

  const { data: villa, error: villaErr } = await supabase
    .from("villas")
    .select("*")
    .eq("id", id)
    .single();

  if (villaErr || !villa) {
    if (villaErr) console.error("admin villa GET failed:", villaErr);
    return NextResponse.json({ error: "Villa bulunamadı" }, { status: 404 });
  }

  const [photosResult, categoryLinksResult] = await Promise.all([
    supabase
      .from("villa_photos")
      .select("id, url, is_primary, order_index")
      .eq("villa_id", id)
      .order("order_index", { ascending: true }),
    supabase.from("villa_categories").select("category_id").eq("villa_id", id),
  ]);

  if (photosResult.error) {
    console.error("admin villa photos GET failed:", photosResult.error);
    return NextResponse.json(
      { error: `Fotoğraflar alınamadı: ${photosResult.error.message}` },
      { status: 500 },
    );
  }

  if (categoryLinksResult.error) {
    console.error("admin villa categories GET failed:", categoryLinksResult.error);
    return NextResponse.json(
      { error: `Kategori bağlantıları alınamadı: ${categoryLinksResult.error.message}` },
      { status: 500 },
    );
  }

  const photos = sortVillaPhotos((photosResult.data ?? []) as PhotoRow[]);
  const categoryIds = ((categoryLinksResult.data ?? []) as CategoryLinkRow[]).map(
    (link) => link.category_id,
  );

  return NextResponse.json({
    villa: {
      ...villa,
      photos,
      categoryIds,
    },
  });
}

/**
 * PATCH /api/admin/villas/:id
 * Sadece gönderilen alanları günceller.
 * Beklenen payload (örnek):
 * {
 *   villa?: Partial<...villa kolonları...>,
 *   photos?: Array<{ id?: string; url: string; is_primary: boolean; order_index: number }>,
 *   categoryIds?: string[]
 * }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = createServiceRoleClient();

  let payload: VillaPatchPayload = {};
  try {
    const json = await req.json();
    if (!isRecord(json)) {
      return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
    }
    payload = json;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const villa = isRecord(payload.villa) ? payload.villa : null;
  const photos = Array.isArray(payload.photos) ? (payload.photos as VillaPhotoInput[]) : null;
  const categoryIds = Array.isArray(payload.categoryIds)
    ? payload.categoryIds.filter((cid): cid is string => typeof cid === "string")
    : null;

  // 1) VİLLA alanları (yalnızca gönderilen property'ler)
  if (villa) {
    const v: Record<string, unknown> = {};

    // Temel metin/sayı/boolean alanlar — alan gönderildiyse güncelle
    const simpleKeys: Array<keyof VillaUpdate & string> = [
      "name",
      "description",
      "bedrooms",
      "bathrooms",
      "has_pool",
      "sea_distance",
      "lat",
      "lng",
      "is_hidden",
      "priority",
      "cleaning_fee",
      "capacity",
      "province",
      "district",
      "neighborhood",
      // document_number: create'te set, edit'te YOK SAYIYORUZ
    ];

    for (const k of simpleKeys) {
      if (hasOwn(villa, k)) {
        v[k] = villa[k];
      }
    }

    // Boolean feature alanları
    for (const k of FEATURE_KEYS) {
      if (hasOwn(villa, k)) v[k] = !!villa[k];
    }

    // OWNER_ID: geldiyse kontrol et ve güncelle
    if (hasOwn(villa, "owner_id")) {
      const owner_id_raw = villa.owner_id;
      // null'a izin veriyorsanız null bırakın; zorunlu olsun istiyorsanız burada 400 dönebilirsiniz.
      if (owner_id_raw) {
        const owner_id = String(owner_id_raw);
        const { count, error } = await supabase
          .from("owners")
          .select("*", { count: "exact", head: true })
          .eq("id", owner_id);

        if (error) {
          return NextResponse.json(
            { error: `Sahip kontrolü başarısız: ${error.message}` },
            { status: 500 },
          );
        }
        if ((count ?? 0) === 0) {
          return NextResponse.json({ error: "Geçersiz owner_id." }, { status: 400 });
        }
        v.owner_id = owner_id;
      } else {
        // null/boş gönderilmişse null set (iş kuralınıza göre kapatabilirsiniz)
        v.owner_id = null;
      }
    }

    // Tip normalizasyonları
    if (hasOwn(v, "name") && typeof v.name === "string") v.name = v.name.trim();
    if (hasOwn(v, "priority") && v.priority != null) {
      v.priority = Math.min(5, Math.max(1, Number(v.priority)));
    }
    if (hasOwn(v, "bedrooms") && v.bedrooms != null) v.bedrooms = Number(v.bedrooms);
    if (hasOwn(v, "bathrooms") && v.bathrooms != null) v.bathrooms = Number(v.bathrooms);
    if (hasOwn(v, "cleaning_fee") && v.cleaning_fee != null)
      v.cleaning_fee = Math.max(0, Number(v.cleaning_fee));
    if (hasOwn(v, "capacity") && v.capacity != null) v.capacity = Number(v.capacity);
    if (hasOwn(v, "lat")) v.lat = v.lat === "" || v.lat == null ? null : Number(v.lat);
    if (hasOwn(v, "lng")) v.lng = v.lng === "" || v.lng == null ? null : Number(v.lng);

    // document_number edit'te güncellenmez (bilerek ignore)
    // if (hasOwn(villa, "document_number")) { /* ignore */ }

    // herhangi bir alan geldiyse updated_at'i güncelle
    if (Object.keys(v).length > 0) {
      v.updated_at = new Date().toISOString();
      const { error: upErr } = await supabase.from("villas").update(v as VillaUpdate).eq("id", id);
      if (upErr) {
        return NextResponse.json(
          { error: `Villa güncellenemedi: ${upErr.message}` },
          { status: 500 },
        );
      }
    }
  }

  // 2) FOTOĞRAFLAR (yalnızca değişiklik)
  if (photos) {
    // Mevcut fotoğrafları çek
    const { data: existingPhotos, error: exPhErr } = await supabase
      .from("villa_photos")
      .select("id, url, is_primary, order_index")
      .eq("villa_id", id)
      .order("order_index", { ascending: true });

    if (exPhErr) {
      return NextResponse.json(
        { error: `Fotoğraflar alınamadı: ${exPhErr.message}` },
        { status: 500 },
      );
    }

    const existingById = new Map<string, PhotoRow>();
    (existingPhotos || []).forEach((p) => existingById.set(p.id, p));

    // Payload'dan gelenleri ayır: yeni / mevcut
    const incomingWithId = photos.filter((p) => p.id);
    const incomingIds = new Set(incomingWithId.map((p) => String(p.id)));

    const toDelete = (existingPhotos || [])
      .filter((p) => !incomingIds.has(p.id)) // payload'da artık yoksa sil
      .map((p) => p.id);

    // Silinecekler
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from("villa_photos").delete().in("id", toDelete);
      if (delErr) {
        return NextResponse.json(
          { error: `Foto silme hatası: ${delErr.message}` },
          { status: 500 },
        );
      }
    }

    // Güncellenecek mevcutlar (sıra/kapak/url değişmiş mi?)
    for (const p of incomingWithId) {
      const prev = existingById.get(String(p.id));
      if (!prev) continue;
      const nextOrder = Number(p.order_index ?? 0);
      const nextPrimary = !!p.is_primary;
      const nextUrl = String(p.url);

      const needUpdate =
        (prev.order_index ?? 0) !== nextOrder ||
        !!prev.is_primary !== nextPrimary ||
        prev.url !== nextUrl;

      if (needUpdate) {
        const { error: updErr } = await supabase
          .from("villa_photos")
          .update({
            url: nextUrl,
            is_primary: nextPrimary,
            order_index: nextOrder,
          })
          .eq("id", prev.id);
        if (updErr) {
          return NextResponse.json(
            { error: `Foto güncellenemedi (${prev.id}): ${updErr.message}` },
            { status: 500 },
          );
        }
      }
    }

    // Yeni eklenecekler (id yok)
    const newOnes = photos.filter((p) => !p.id);
    if (newOnes.length > 0) {
      const rows = newOnes.map((p, i) => ({
        villa_id: id,
        url: String(p.url),
        is_primary: !!p.is_primary,
        order_index: Number(p.order_index ?? i),
      }));
      const { error: insErr } = await supabase.from("villa_photos").insert(rows);
      if (insErr) {
        return NextResponse.json({ error: `Foto eklenemedi: ${insErr.message}` }, { status: 500 });
      }
    }
  }

  // 3) KATEGORİLER (yalnızca farkları uygula)
  if (Array.isArray(categoryIds)) {
    const { data: existingLinks, error: linkErr } = await supabase
      .from("villa_categories")
      .select("category_id")
      .eq("villa_id", id);

    if (linkErr) {
      return NextResponse.json(
        { error: `Kategori bağlantıları alınamadı: ${linkErr.message}` },
        { status: 500 },
      );
    }

    const currentSet = new Set((existingLinks || []).map((r) => r.category_id));
    const nextSet = new Set(categoryIds);

    const toAdd: string[] = [];
    const toRemove: string[] = [];

    // Eklenecekler
    for (const cid of nextSet) if (!currentSet.has(cid)) toAdd.push(cid);
    // Silinecekler
    for (const cid of currentSet) if (!nextSet.has(cid)) toRemove.push(cid);

    if (toAdd.length > 0) {
      const rows = toAdd.map((cid) => ({ villa_id: id, category_id: cid }));
      const { error: aErr } = await supabase.from("villa_categories").insert(rows);
      if (aErr) {
        return NextResponse.json(
          { error: `Kategori eklenemedi: ${aErr.message}` },
          { status: 500 },
        );
      }
    }
    if (toRemove.length > 0) {
      const { error: rErr } = await supabase
        .from("villa_categories")
        .delete()
        .eq("villa_id", id)
        .in("category_id", toRemove);
      if (rErr) {
        return NextResponse.json(
          { error: `Kategori silinemedi: ${rErr.message}` },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/villas/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Villa id eksik" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // 1) Bağlı kayıtları sil
  const children: Array<{ table: string; col: string }> = [
    { table: "reservations", col: "villa_id" },
    { table: "blocked_dates", col: "villa_id" },
    { table: "villa_pricing_periods", col: "villa_id" },
    { table: "villa_discount_periods", col: "villa_id" },
    { table: "villa_photos", col: "villa_id" },
    { table: "villa_categories", col: "villa_id" },
    { table: "villa_features", col: "villa_id" },
  ];

  for (const { table, col } of children) {
    const { error } = await supabase.from(table).delete().eq(col, id);
    if (error) {
      return NextResponse.json(
        { error: `[${table}] silinemedi: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // 2) Parent kaydı sil
  const { error: villaErr } = await supabase.from("villas").delete().eq("id", id);
  if (villaErr) {
    return NextResponse.json(
      { error: `[villas] silinemedi: ${villaErr.message}` },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
