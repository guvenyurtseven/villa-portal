import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createServiceRoleClient();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const { villa, photos = [], categoryIds = [] } = body || {};
  if (!villa?.name || !villa?.location) {
    return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json({ error: "En az bir fotoğraf gönderin" }, { status: 400 });
  }

  // 1) Villa kaydı
  const toInsert = {
    name: String(villa.name).trim(),
    location: String(villa.location).trim(),
    weekly_price: Number(villa.weekly_price || 0),
    description: villa.description ?? null,
    bedrooms: villa.bedrooms ?? null,
    bathrooms: villa.bathrooms ?? null,
    has_pool: !!villa.has_pool,
    sea_distance: villa.sea_distance ?? null,
    lat: villa.lat === null || villa.lat === undefined ? null : Number(villa.lat),
    lng: villa.lng === null || villa.lng === undefined ? null : Number(villa.lng),
    is_hidden: !!villa.is_hidden,
    priority: Math.min(5, Math.max(1, Number(villa.priority) || 1)),
  };

  const { data: ins, error: insErr } = await supabase
    .from("villas")
    .insert(toInsert)
    .select("id")
    .single();

  if (insErr || !ins?.id) {
    console.error("Villa insert error:", insErr);
    return NextResponse.json({ error: "Villa ekleme başarısız" }, { status: 500 });
  }

  const villaId: string = ins.id as string;

  // 2) Fotoğraflar (ilk foto kapak)
  const normalizedPhotos = photos.map((p: any, i: number) => ({
    villa_id: villaId,
    url: String(p.url),
    is_primary: i === 0 ? true : !!p.is_primary,
    order_index: i,
  }));

  const { error: photoErr } = await supabase.from("villa_photos").insert(normalizedPhotos);
  if (photoErr) {
    console.error("Photo insert error:", photoErr);
    // soft-fail: kaydı dönelim ama log aldık
  }

  // 3) Kategori bağlantıları
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const rows = categoryIds.map((cid: string) => ({ villa_id: villaId, category_id: cid }));
    const { error: linkErr } = await supabase.from("villa_categories").insert(rows);
    if (linkErr) {
      console.error("Category link insert error:", linkErr);
    }
  }

  return NextResponse.json({ ok: true, id: villaId });
}
