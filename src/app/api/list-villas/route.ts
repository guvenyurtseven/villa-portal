// src/app/api/list-villas/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server"; // search-villas ile aynı yolu kullan

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VillaRow = {
  id: string;
  name: string;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  priority: number | null;
  // created_at vb. sıralama alanları tablo şemasında mevcut
};

type PhotoRow = {
  villa_id: string;
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    const supa = createServiceRoleClient();

    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get("pageSize") ?? 24)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1) Ham toplam (is_hidden'e bakmadan)
    const { count: totalRaw, error: totalRawErr } = await supa
      .from("villas")
      .select("id", { count: "exact", head: true });

    // 2) Görünür toplam (is_hidden = false veya null)
    const { count: totalVisible, error: totalVisErr } = await supa
      .from("villas")
      .select("id", { count: "exact", head: true })
      .or("is_hidden.is.false,is_hidden.is.null"); // NULL'u da görünür kabul et

    if (totalRawErr || totalVisErr) {
      const msg = totalRawErr?.message || totalVisErr?.message || "count error";
      if (debug)
        return NextResponse.json(
          { items: [], error: msg, totalRaw: 0, totalVisible: 0 },
          { status: 500 },
        );
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
    }

    // 3) Asıl veri: sadece görünürler
    const { data: villas, error: villasErr } = await supa
      .from("villas")
      .select(
        `
        id,
        name,
        capacity,
        bedrooms,
        bathrooms,
        province,
        district,
        neighborhood,
        priority,
        created_at
      `,
      )
      .or("is_hidden.is.false,is_hidden.is.null")
      .order("priority", { ascending: false }) // ← önce order
      .order("created_at", { ascending: false })
      .range(from, to); // ← sonra range (sıra önemli)  :contentReference[oaicite:3]{index=3}

    if (villasErr) {
      if (debug)
        return NextResponse.json(
          { items: [], error: villasErr.message, totalRaw, totalVisible },
          { status: 500 },
        );
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
    }

    const ids = (villas ?? []).map((v) => v.id);
    const photosByVilla = new Map<string, PhotoRow[]>();

    if (ids.length > 0) {
      // 4) Fotoğrafları ayrı çek (embedding'e bağlı kalmayalım)
      const { data: photos, error: photosErr } = await supa
        .from("villa_photos")
        .select("villa_id, url, is_primary, order_index")
        .in("villa_id", ids);

      if (photosErr && debug) {
        return NextResponse.json(
          {
            items: [],
            error: `photos: ${photosErr.message}`,
            totalRaw,
            totalVisible,
          },
          { status: 500 },
        );
      }

      (photos ?? []).forEach((p) => {
        const arr = photosByVilla.get(p.villa_id) ?? [];
        arr.push(p);
        photosByVilla.set(p.villa_id, arr);
      });
    }

    const items = (villas ?? []).map((v: VillaRow) => {
      const sorted = (photosByVilla.get(v.id) ?? [])
        .slice()
        .sort((a, b) => {
          const ap = a?.is_primary ? 0 : 1;
          const bp = b?.is_primary ? 0 : 1;
          if (ap !== bp) return ap - bp;
          return (a?.order_index ?? 999) - (b?.order_index ?? 999);
        })
        .map((p) => p.url)
        .filter(Boolean);

      return {
        id: v.id,
        name: v.name,
        capacity: v.capacity ?? null,
        bedrooms: v.bedrooms ?? null,
        bathrooms: v.bathrooms ?? null,
        province: v.province ?? null,
        district: v.district ?? null,
        neighborhood: v.neighborhood ?? null,
        images: sorted.slice(0, 8),
        priority: v.priority ?? 0,
      };
    });

    return NextResponse.json({
      items,
      total: totalVisible ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((totalVisible ?? 0) / pageSize),
      ...(debug ? { totalRaw } : {}),
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (debug) return NextResponse.json({ items: [], error: msg }, { status: 500 });
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}
