import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { FEATURE_KEYS } from "@/domain/villas/FeatureCatalog";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;
type VillaPhotoInput = {
  url?: unknown;
  is_primary?: unknown;
  order_index?: unknown;
};
type VillaCreatePayload = {
  villa?: unknown;
  photos?: unknown;
  categoryIds?: unknown;
};
type VillaInsertPayload = Record<string, string | number | boolean | null>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableText(value: unknown) {
  return value == null ? null : String(value);
}

function trimmedTextOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  let payload: VillaCreatePayload = {};
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
  const photos = Array.isArray(payload.photos) ? (payload.photos as VillaPhotoInput[]) : [];
  const categoryIds = Array.isArray(payload.categoryIds)
    ? payload.categoryIds.filter((cid): cid is string => typeof cid === "string")
    : [];
  if (!villa?.name) {
    return NextResponse.json({ error: "İsim zorunlu" }, { status: 400 });
  }

  if (photos.length === 0) {
    return NextResponse.json({ error: "En az bir fotoğraf ekleyin." }, { status: 400 });
  }

  if (photos.some((photo) => !trimmedTextOrNull(photo.url))) {
    return NextResponse.json({ error: "Fotoğraf URL alanı zorunludur." }, { status: 400 });
  }

  const documentNumber = trimmedTextOrNull(villa.document_number);
  if (!documentNumber) {
    return NextResponse.json({ error: "Belge numarası alanı zorunludur." }, { status: 400 });
  }

  // owner_id zorunlu + string doğrulama
  const owner_id: string | null =
    typeof villa?.owner_id === "string" && villa.owner_id.trim() ? villa.owner_id.trim() : null;

  if (!owner_id) {
    return NextResponse.json({ error: "owner_id zorunludur." }, { status: 400 });
  }

  // owner var mı? (existence check)
  const { count: ownerCount, error: ownerErr } = await supabase
    .from("owners")
    .select("*", { count: "exact", head: true })
    .eq("id", owner_id);

  if (ownerErr) {
    console.error("owner existence check error", ownerErr);
    return NextResponse.json({ error: ownerErr.message }, { status: 500 });
  }
  if ((ownerCount ?? 0) === 0) {
    return NextResponse.json({ error: "Geçersiz owner_id." }, { status: 400 });
  }

  // villa alanlarını derle (weekly_price KALDIRILDI)
  const data: VillaInsertPayload = {
    name: String(villa.name).trim(),
    description: nullableText(villa.description),
    bedrooms: typeof villa.bedrooms === "number" ? villa.bedrooms : Number(villa.bedrooms || 0),
    bathrooms: typeof villa.bathrooms === "number" ? villa.bathrooms : Number(villa.bathrooms || 0),
    has_pool: !!villa.has_pool,
    sea_distance: nullableText(villa.sea_distance),
    lat: villa.lat === null || villa.lat === "" ? null : Number(villa.lat),
    lng: villa.lng === null || villa.lng === "" ? null : Number(villa.lng),
    is_hidden: !!villa.is_hidden,
    priority: Math.min(5, Math.max(1, Number(villa.priority || 1))),
    cleaning_fee:
      typeof villa.cleaning_fee === "number" ? villa.cleaning_fee : Number(villa.cleaning_fee || 0),
    capacity: typeof villa.capacity === "number" ? villa.capacity : Number(villa.capacity || 4),
    province: trimmedTextOrNull(villa.province),
    district: trimmedTextOrNull(villa.district),
    neighborhood: trimmedTextOrNull(villa.neighborhood),
    document_number: documentNumber,

    // KRİTİK: owner_id'yi mutlaka yaz
    owner_id,
  };

  // boolean özellikleri ekle
  for (const k of FEATURE_KEYS) data[k] = !!villa[k];

  // 1) villa insert
  const { data: inserted, error: insErr } = await supabase
    .from("villas")
    .insert(data)
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("villa insert error", insErr);
    return NextResponse.json({ error: "Villa oluşturulamadı" }, { status: 500 });
  }

  const villaId = inserted.id;

  // 2) foto ekleme (varsa)
  if (photos.length > 0) {
    const rows = photos.map((p, i) => ({
      villa_id: villaId,
      url: String(p.url),
      is_primary: !!p.is_primary,
      order_index: p.order_index ?? i,
    }));
    const { error: phErr } = await supabase.from("villa_photos").insert(rows);
    if (phErr) console.error("photo insert error", phErr);
  }

  // 3) kategori linkleri (opsiyonel)
  if (categoryIds.length > 0) {
    const linkRows = categoryIds.map((cid) => ({ villa_id: villaId, category_id: cid }));
    const { error: linkErr } = await supabase.from("villa_categories").insert(linkRows);
    if (linkErr) console.error("category link insert error", linkErr);
  }

  return NextResponse.json({ id: villaId }, { status: 201 });
}
