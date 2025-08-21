import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Public URL'den storage path'ini çıkar (villa-photos bucket'ı için)
function extractStoragePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/villa-photos/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const supabase = createServiceRoleClient();

  const { data: villa, error: villaErr } = await supabase
    .from("villas")
    .select("*")
    .eq("id", id)
    .single();

  if (villaErr || !villa) return new NextResponse("Not found", { status: 404 });

  const { data: photos, error: photosErr } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", id)
    .order("order_index", { ascending: true });

  if (photosErr) {
    console.error("Photo load error:", photosErr);
  }

  return NextResponse.json({ villa, photos: photos ?? [] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const supabase = createServiceRoleClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (!body || !body.villa || !Array.isArray(body.photos)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const villaPayload = body.villa as {
    name: string;
    location: string;
    weekly_price: number;
    description: string | null;
    bedrooms: number;
    bathrooms: number;
    has_pool: boolean;
    sea_distance: string | null;
    lat: number | null;
    lng: number | null;
    is_hidden: boolean;
    priority?: number;
  };

  // ---- 1) VİLLAYI GÜNCELLE (priority dahil) ----
  const priority =
    typeof villaPayload.priority === "number"
      ? Math.min(5, Math.max(1, Math.trunc(villaPayload.priority)))
      : undefined;

  const { error: upErr } = await supabase
    .from("villas")
    .update({
      name: villaPayload.name,
      location: villaPayload.location,
      weekly_price: villaPayload.weekly_price,
      description: villaPayload.description,
      bedrooms: villaPayload.bedrooms,
      bathrooms: villaPayload.bathrooms,
      has_pool: villaPayload.has_pool,
      sea_distance: villaPayload.sea_distance,
      lat: villaPayload.lat,
      lng: villaPayload.lng,
      is_hidden: villaPayload.is_hidden,
      ...(priority !== undefined ? { priority } : {}),
    })
    .eq("id", id);

  if (upErr) {
    console.error("Villa update error:", upErr);
    return new NextResponse("Villa update failed", { status: 500 });
  }

  // ---- 2) FOTOĞRAFLARI SENKRONİZE ET ----
  const photosPayload = (body.photos as any[]).map((p, idx) => ({
    id: p.id as string | undefined,
    url: String(p.url),
    is_primary: Boolean(p.is_primary),
    order_index: Number(p.order_index ?? idx),
  }));

  const { data: currentPhotos, error: curErr } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", id);

  if (curErr) {
    console.error("Load current photos error:", curErr);
    return new NextResponse("Photo load failed", { status: 500 });
  }

  const currentById = new Map<string, any>();
  for (const p of currentPhotos ?? []) {
    if (p.id) currentById.set(p.id, p);
  }

  // 2a) Silinecekler (payload'da olmayan mevcutlar)
  const desiredIds = new Set(photosPayload.map((p) => p.id).filter(Boolean) as string[]);
  const toDelete = (currentPhotos ?? []).filter((p: any) => !desiredIds.has(p.id));

  if (toDelete.length) {
    const ids = toDelete.map((p: any) => p.id);
    const paths = toDelete
      .map((p: any) => extractStoragePathFromPublicUrl(p.url))
      .filter(Boolean) as string[];

    const { error: delDbErr } = await supabase.from("villa_photos").delete().in("id", ids);
    if (delDbErr) {
      console.error("DB photo delete error:", delDbErr);
      return new NextResponse("Photo delete failed", { status: 500 });
    }

    if (paths.length) {
      const { error: delStErr } = await supabase.storage.from("villa-photos").remove(paths);
      if (delStErr) console.warn("Storage remove warning:", delStErr);
    }
  }

  // 2b) Eklenecekler (id'si olmayanlar)
  const toInsert = photosPayload.filter((p) => !p.id);
  if (toInsert.length) {
    const rows = toInsert.map((p) => ({
      villa_id: id,
      url: p.url,
      is_primary: !!p.is_primary,
      order_index: Number(p.order_index ?? 0),
    }));
    const { error: insErr } = await supabase.from("villa_photos").insert(rows);
    if (insErr) {
      console.error("Photo insert error:", insErr);
      return new NextResponse("Photo insert failed", { status: 500 });
    }
  }

  // 2c) Güncellenecekler (id'si olanlar)
  const toUpdate = photosPayload.filter((p) => p.id && currentById.has(p.id!));
  for (const p of toUpdate) {
    const { error: updErr } = await supabase
      .from("villa_photos")
      .update({
        url: p.url,
        is_primary: !!p.is_primary,
        order_index: Number(p.order_index ?? 0),
      })
      .eq("id", p.id as string);
    if (updErr) {
      console.error("Photo update error:", updErr);
      return new NextResponse("Photo update failed", { status: 500 });
    }
  }

  // 2d) Tek kapak garantisi (payload'a göre)
  const primary = photosPayload.find((p) => p.is_primary);
  if (primary) {
    const { error: resetErr } = await supabase
      .from("villa_photos")
      .update({ is_primary: false })
      .eq("villa_id", id);
    if (!resetErr) {
      const { error: setErr } = await supabase
        .from("villa_photos")
        .update({ is_primary: true })
        .eq("villa_id", id)
        .eq("url", primary.url);
      if (setErr) console.warn("Primary set warning:", setErr);
    } else {
      console.warn("Primary reset warning:", resetErr);
    }
  }

  return NextResponse.json({ ok: true });
}
