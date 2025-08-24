import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> },
) {
  // Next 15: params Promise olabilir → önce await
  const { id: villaId } = await Promise.resolve((ctx as any).params);

  const supabase = createServiceRoleClient();

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const { villa, photos = [], categoryIds } = payload || {};

  // 1) villa update
  if (villa && typeof villa === "object") {
    const upd: any = {};
    if ("name" in villa) upd.name = String(villa.name).trim();
    if ("weekly_price" in villa) upd.weekly_price = Number(villa.weekly_price || 0);
    if ("description" in villa) upd.description = villa.description ?? null;
    if ("bedrooms" in villa) upd.bedrooms = Number(villa.bedrooms || 0);
    if ("bathrooms" in villa) upd.bathrooms = Number(villa.bathrooms || 0);
    if ("has_pool" in villa) upd.has_pool = !!villa.has_pool;
    if ("sea_distance" in villa) upd.sea_distance = villa.sea_distance ?? null;
    if ("lat" in villa) upd.lat = villa.lat === null || villa.lat === "" ? null : Number(villa.lat);
    if ("lng" in villa) upd.lng = villa.lng === null || villa.lng === "" ? null : Number(villa.lng);
    if ("is_hidden" in villa) upd.is_hidden = !!villa.is_hidden;
    if ("priority" in villa) upd.priority = Math.min(5, Math.max(1, Number(villa.priority || 1)));

    // boolean özellikler:
    for (const k of FEATURE_KEYS) if (k in villa) upd[k] = !!villa[k];

    if (Object.keys(upd).length > 0) {
      const { error: upErr } = await supabase.from("villas").update(upd).eq("id", villaId);
      if (upErr) {
        console.error("Villa update error:", upErr);
        return NextResponse.json({ error: "Villa güncelleme başarısız" }, { status: 500 });
      }
    }
  }

  // 2) foto senkronizasyonu
  if (Array.isArray(photos)) {
    const { data: currentPhotos, error: curErr } = await supabase
      .from("villa_photos")
      .select("id")
      .eq("villa_id", villaId);

    if (curErr) {
      console.error("Fetch current photos error:", curErr);
      return NextResponse.json({ error: "Fotoğraflar alınamadı" }, { status: 500 });
    }

    const currentIds = new Set((currentPhotos ?? []).map((p) => p.id));
    const incomingWithId = photos.filter((p: any) => p.id);
    const incomingIds = new Set(incomingWithId.map((p: any) => p.id));

    // silinecekler
    const toDelete = [...currentIds].filter((id) => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from("villa_photos").delete().in("id", toDelete);
    }

    // güncellenecekler
    for (const p of incomingWithId) {
      await supabase
        .from("villa_photos")
        .update({
          url: String(p.url),
          is_primary: !!p.is_primary,
          order_index: Number(p.order_index || 0),
        })
        .eq("id", p.id);
    }

    // eklenecekler
    const toInsert = photos
      .filter((p: any) => !p.id)
      .map((p: any, i: number) => ({
        villa_id: villaId,
        url: String(p.url),
        is_primary: !!p.is_primary,
        order_index: Number(p.order_index ?? i),
      }));
    if (toInsert.length > 0) {
      await supabase.from("villa_photos").insert(toInsert);
    }

    // kapak tutarlılığı
    const { data: allAfter } = await supabase
      .from("villa_photos")
      .select("id, order_index")
      .eq("villa_id", villaId);

    if (allAfter && allAfter.length > 0) {
      const primaryId = allAfter.sort(
        (a, b) => Number(a.order_index || 0) - Number(b.order_index || 0),
      )[0].id;

      await supabase.from("villa_photos").update({ is_primary: false }).eq("villa_id", villaId);
      await supabase.from("villa_photos").update({ is_primary: true }).eq("id", primaryId);
    }
  }

  // 3) kategori bağlantıları (opsiyonel)
  if (Array.isArray(categoryIds)) {
    const { data: currentLinks } = await supabase
      .from("villa_categories")
      .select("category_id")
      .eq("villa_id", villaId);

    const current = new Set((currentLinks ?? []).map((r) => r.category_id));
    const next = new Set(categoryIds as string[]);

    const toAdd = [...next].filter((x) => !current.has(x));
    const toRemove = [...current].filter((x) => !next.has(x));

    if (toRemove.length > 0) {
      await supabase
        .from("villa_categories")
        .delete()
        .eq("villa_id", villaId)
        .in("category_id", toRemove);
    }
    if (toAdd.length > 0) {
      const rows = toAdd.map((cid) => ({ villa_id: villaId, category_id: cid }));
      await supabase.from("villa_categories").insert(rows);
    }
  }

  return NextResponse.json({ ok: true, id: villaId });
}
