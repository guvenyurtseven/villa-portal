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

  // --- YENİ: Belge numarası yalnızca oluşturma esnasında zorunlu ---
  // Hem payload.document_number hem de villa.document_number üzerinden destek veriyoruz.
  const documentNumberRaw =
    typeof villa?.document_number === "string" && villa.document_number.trim()
      ? villa.document_number.trim()
      : typeof payload?.document_number === "string"
        ? payload.document_number.trim()
        : "";

  if (!documentNumberRaw) {
    return NextResponse.json({ error: "Belge numarası zorunludur" }, { status: 400 });
  }
  // --- /YENİ ---

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
    province: villa.villa?.province?.trim() || null,
    district: villa.villa?.district?.trim() || null,
    neighborhood: villa.villa?.neighborhood?.trim() || null,

    // --- YENİ: document_number'ı yalnızca create akışında set ediyoruz
    // reference_code'u ASLA burada göndermiyoruz; DB trigger üretiyor.
    document_number: documentNumberRaw,
  };

  // boolean özellikleri ekle
  for (const k of FEATURE_KEYS) data[k] = !!villa[k];

  // 1) villa insert (reference_code gönderilmez; trigger otomatik üretir)
  const { data: inserted, error: insErr } = await supabase
    .from("villas")
    .insert(data)
    .select("id") // id'yi geri almak için select kullan
    .single();

  if (insErr || !inserted) {
    console.error(insErr);
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

  return NextResponse.json({ id: villaId });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // <-- params artık Promise
) {
  const { id } = await params; // <-- await et
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  return NextResponse.json({ ok: true, id });
}

// DELETE /api/admin/villas/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // <-- Promise
) {
  const { id } = await params; // <-- await et
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

  // 204 No Content
  return new NextResponse(null, { status: 204 });
}
