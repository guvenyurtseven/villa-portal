import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Not: Next.js 15'te params Promise olabilir; özelliğine erişmeden önce await etmeliyiz.
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> },
) {
  // 🔧 params'ı await edip "params.id" kullanımını ortadan kaldırıyoruz
  const villaParams = await Promise.resolve((ctx as any).params);
  const villaId: string = villaParams.id;

  const supabase = createServiceRoleClient();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const { villa, photos = [], categoryIds } = body || {};

  // 1) Villa bilgileri
  if (villa && typeof villa === "object") {
    const updateData: any = {};
    if ("name" in villa) updateData.name = String(villa.name).trim();
    if ("location" in villa) updateData.location = String(villa.location).trim();
    if ("weekly_price" in villa) updateData.weekly_price = Number(villa.weekly_price || 0);
    if ("description" in villa) updateData.description = villa.description ?? null;
    if ("bedrooms" in villa) updateData.bedrooms = villa.bedrooms ?? null;
    if ("bathrooms" in villa) updateData.bathrooms = villa.bathrooms ?? null;
    if ("has_pool" in villa) updateData.has_pool = !!villa.has_pool;
    if ("sea_distance" in villa) updateData.sea_distance = villa.sea_distance ?? null;
    if ("lat" in villa) updateData.lat = villa.lat === null ? null : Number(villa.lat);
    if ("lng" in villa) updateData.lng = villa.lng === null ? null : Number(villa.lng);
    if ("is_hidden" in villa) updateData.is_hidden = !!villa.is_hidden;
    if ("priority" in villa)
      updateData.priority = Math.min(5, Math.max(1, Number(villa.priority) || 1));

    if (Object.keys(updateData).length > 0) {
      const { error: upErr } = await supabase.from("villas").update(updateData).eq("id", villaId);
      if (upErr) {
        console.error("Villa update error:", upErr);
        return NextResponse.json({ error: "Villa güncelleme başarısız" }, { status: 500 });
      }
    }
  }

  // 2) Fotoğraflar (tam senkronizasyon)
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
      const { error: delErr } = await supabase.from("villa_photos").delete().in("id", toDelete);
      if (delErr) console.error("Photo delete error:", delErr);
    }

    // güncellenecekler
    for (const p of incomingWithId) {
      const { id, url, is_primary, order_index } = p;
      const { error: updErr } = await supabase
        .from("villa_photos")
        .update({
          url: String(url),
          is_primary: !!is_primary,
          order_index: Number(order_index || 0),
        })
        .eq("id", id);
      if (updErr) console.error("Photo update error:", updErr);
    }

    // eklenecekler
    const toInsert = photos
      .filter((p: any) => !p.id)
      .map((p: any) => ({
        villa_id: villaId,
        url: String(p.url),
        is_primary: !!p.is_primary,
        order_index: Number(p.order_index || 0),
      }));
    if (toInsert.length > 0) {
      const { error: insPErr } = await supabase.from("villa_photos").insert(toInsert);
      if (insPErr) console.error("Photo insert error:", insPErr);
    }

    // kapak fotoğrafı tutarlılığı: en küçük order_index = kapak
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

  // 3) Kategori bağlantıları (diff)
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
      const { error: delLinkErr } = await supabase
        .from("villa_categories")
        .delete()
        .eq("villa_id", villaId)
        .in("category_id", toRemove);
      if (delLinkErr) console.error("Category unlink error:", delLinkErr);
    }

    if (toAdd.length > 0) {
      const rows = toAdd.map((cid) => ({ villa_id: villaId, category_id: cid }));
      const { error: addLinkErr } = await supabase.from("villa_categories").insert(rows);
      if (addLinkErr) console.error("Category link insert error:", addLinkErr);
    }
  }

  return NextResponse.json({ ok: true, id: villaId });
}
