// src/app/api/admin/villas/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";

// Yardımcı: Storage path'i public URL'den çıkar
function extractStoragePathFromPublicUrl(url: string) {
  // .../storage/v1/object/public/villa-photos/<PATH>
  const marker = "/storage/v1/object/public/villa-photos/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const supabase = getAdminClient();

  const { data: villa, error: vErr } = await supabase
    .from("villas")
    .select("*")
    .eq("id", params.id)
    .single();

  if (vErr || !villa) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: photos, error: pErr } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", params.id)
    .order("order_index", { ascending: true });

  if (pErr) {
    return NextResponse.json({ villa, photos: [] });
  }

  return NextResponse.json({ villa, photos });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = getAdminClient();
  const body = await req.json().catch(() => null);

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
  };

  const photosPayload = (body.photos as any[]).map((p, idx) => ({
    id: p.id as string | undefined,
    url: String(p.url),
    is_primary: Boolean(p.is_primary),
    order_index: Number(p.order_index ?? idx),
  }));

  // 1) Villa güncelle
  {
    const { error } = await supabase
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
      })
      .eq("id", params.id);

    if (error) {
      console.error("Villa update error:", error);
      return new NextResponse("Villa update failed", { status: 500 });
    }
  }

  // 2) Fotoğrafları senkronize et
  const { data: currentPhotos, error: curErr } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", params.id);

  if (curErr) {
    console.error(curErr);
    return new NextResponse("Photo load failed", { status: 500 });
  }

  const currentMap = new Map<string, any>();
  for (const p of currentPhotos ?? []) {
    if (p.id) currentMap.set(p.id, p);
  }

  const desiredIds = new Set<string>();
  for (const p of photosPayload) {
    if (p.id) desiredIds.add(p.id);
  }

  // 2a) Silinecek fotoğraflar (DB + Storage)
  const toDelete = (currentPhotos ?? []).filter((p: any) => !desiredIds.has(p.id));
  if (toDelete.length > 0) {
    const ids = toDelete.map((p: any) => p.id);
    const paths = toDelete
      .map((p: any) => extractStoragePathFromPublicUrl(p.url))
      .filter(Boolean) as string[];

    // DB'den sil
    const { error: delErr } = await supabase.from("villa_photos").delete().in("id", ids);

    if (delErr) {
      console.error("DB photo delete error:", delErr);
      return new NextResponse("Photo delete failed", { status: 500 });
    }

    // Storage'tan sil (best effort)
    if (paths.length > 0) {
      const { error: stErr } = await supabase.storage.from("villa-photos").remove(paths);

      if (stErr) {
        // loglayıp devam
        console.warn("Storage remove warning:", stErr);
      }
    }
  }

  // 2b) Eklenecek fotoğraflar (id yok)
  const toInsert = photosPayload.filter((p: any) => !p.id);
  if (toInsert.length > 0) {
    const insertRows = toInsert.map((p) => ({
      villa_id: params.id,
      url: p.url,
      is_primary: !!p.is_primary,
      order_index: Number(p.order_index ?? 0),
    }));

    const { error: insErr } = await supabase.from("villa_photos").insert(insertRows);
    if (insErr) {
      console.error("Photo insert error:", insErr);
      return new NextResponse("Photo insert failed", { status: 500 });
    }
  }

  // 2c) Güncellenecek fotoğraflar (id var)
  const toUpdate = photosPayload.filter((p: any) => p.id && currentMap.has(p.id));
  for (const p of toUpdate) {
    const { error: upErr } = await supabase
      .from("villa_photos")
      .update({
        url: p.url, // normalde URL değişmez ama güvenli olsun
        is_primary: !!p.is_primary,
        order_index: Number(p.order_index ?? 0),
      })
      .eq("id", p.id);

    if (upErr) {
      console.error("Photo update error:", upErr);
      return new NextResponse("Photo update failed", { status: 500 });
    }
  }

  // 2d) Yalnızca 1 kapak olsun — garanti altına al
  {
    // payload’a göre kapak olanı bul
    const primary = photosPayload.find((p) => p.is_primary);
    if (primary) {
      // tümünü false yap
      const { error: resetErr } = await supabase
        .from("villa_photos")
        .update({ is_primary: false })
        .eq("villa_id", params.id);
      if (resetErr) {
        console.error("Primary reset error:", resetErr);
      } else {
        const { error: setErr } = await supabase
          .from("villa_photos")
          .update({ is_primary: true })
          .eq("villa_id", params.id)
          .eq("url", primary.url); // eşleştirme
        if (setErr) {
          console.error("Primary set error:", setErr);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
