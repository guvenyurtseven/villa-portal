import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/discount-villas?limit=12&from=today
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 12);
    const today = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side
    );

    // 1) Indirimli dönemleri (güncel) çek
    // Not: Görünüm (vw_discount_villas) province/district/neighborhood
    // alanlarını zaten içeriyorsa alacağız; içermiyorsa ikinci adımda villas'tan tamamlarız.
    const { data, error } = await supa
      .from("vw_discount_villas")
      .select("*")
      .gte("end_date", today)
      .order("priority", { ascending: true })
      .order("start_date", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = data ?? [];

    // 2) Görünüm konum alanlarını döndürmüyorsa villas tablosundan tamamla
    // (villa_id alanı görünümde mevcut varsayımıyla)
    const needsLocation = items.some(
      (row: any) => row.province == null && row.district == null && row.neighborhood == null,
    );

    if (needsLocation) {
      const villaIds = Array.from(
        new Set(
          items
            .map((r: any) => r.villa_id)
            .filter((x: any) => typeof x === "string" && x.length > 0),
        ),
      );

      if (villaIds.length > 0) {
        const { data: villaLocs, error: locErr } = await supa
          .from("villas")
          .select("id, province, district, neighborhood")
          .in("id", villaIds);

        if (locErr) {
          // Lokasyon verisi olmasa da endpoint çalışsın (yalnızca konum boş kalır)
          console.warn("locations fetch error:", locErr.message);
        } else {
          const locById = new Map((villaLocs || []).map((v) => [v.id, v]));

          // Görünümde alan yoksa villas'tan doldur
          for (const row of items as any[]) {
            const loc = locById.get(row.villa_id);
            if (loc) {
              if (row.province == null) row.province = loc.province ?? null;
              if (row.district == null) row.district = loc.district ?? null;
              if (row.neighborhood == null) row.neighborhood = loc.neighborhood ?? null;
            }
          }
        }
      }
    }

    // 3) İsteğe bağlı: İsimleri normalize etmek isterseniz burada map yapabilirsiniz.
    // Şu an mevcut görünümdeki kolon isimlerini olduğu gibi dönüyoruz + konum alanları eklendi.
    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    console.error("discount-villas error:", e?.message || e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
