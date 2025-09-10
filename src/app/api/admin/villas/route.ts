import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Formların gönderdiği boolean özellik anahtarları
const FEATURE_KEYS = [
  "heated_pool",
  "sheltered_pool",
  "tv_satellite",
  "master_bathroom",
  "jacuzzi",
  "fireplace",
  "children_pool",
  "in_site",
  "private_pool",
  "playground",
  "internet",
  "security",
  "sauna",
  "hammam",
  "indoor_pool",
  "baby_bed",
  "high_chair",
  "foosball",
  "table_tennis",
  "underfloor_heating",
  "generator",
  "billiards",
  "pet_friendly",
] as const;

export async function POST(req: NextRequest) {
  const supabase = createServiceRoleClient();

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const { villa, photos = [], categoryIds } = payload || {};
  if (!villa?.name) {
    return NextResponse.json({ error: "İsim zorunlu" }, { status: 400 });
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
  const data: any = {
    name: String(villa.name).trim(),
    description: villa.description ?? null,
    bedrooms: typeof villa.bedrooms === "number" ? villa.bedrooms : Number(villa.bedrooms || 0),
    bathrooms: typeof villa.bathrooms === "number" ? villa.bathrooms : Number(villa.bathrooms || 0),
    has_pool: !!villa.has_pool,
    sea_distance: villa.sea_distance ?? null,
    lat: villa.lat === null || villa.lat === "" ? null : Number(villa.lat),
    lng: villa.lng === null || villa.lng === "" ? null : Number(villa.lng),
    is_hidden: !!villa.is_hidden,
    priority: Math.min(5, Math.max(1, Number(villa.priority || 1))),
    cleaning_fee:
      typeof villa.cleaning_fee === "number" ? villa.cleaning_fee : Number(villa.cleaning_fee || 0),
    capacity: typeof villa.capacity === "number" ? villa.capacity : Number(villa.capacity || 4),
    province: villa?.province?.trim() || null,
    district: villa?.district?.trim() || null,
    neighborhood: villa?.neighborhood?.trim() || null,
    document_number: villa?.document_number?.trim() || null,

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
  if (Array.isArray(photos) && photos.length > 0) {
    const rows = photos.map((p: any, i: number) => ({
      villa_id: villaId,
      url: String(p.url),
      is_primary: !!p.is_primary,
      order_index: p.order_index ?? i,
    }));
    const { error: phErr } = await supabase.from("villa_photos").insert(rows);
    if (phErr) console.error("photo insert error", phErr);
  }

  // 3) kategori linkleri (opsiyonel)
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const linkRows = categoryIds.map((cid: string) => ({ villa_id: villaId, category_id: cid }));
    const { error: linkErr } = await supabase.from("villa_categories").insert(linkRows);
    if (linkErr) console.error("category link insert error", linkErr);
  }

  return NextResponse.json({ id: villaId }, { status: 201 });
}
