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

    // 1) Güncel indirim dönemleri
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

    // 2) Eksik alanları villas'tan tamamla (konum + bedrooms/bathrooms/capacity)
    const needsExtra = items.some(
      (row: any) =>
        (row.province == null && row.district == null && row.neighborhood == null) ||
        row.bedrooms == null ||
        row.bathrooms == null ||
        row.capacity == null,
    );

    if (needsExtra) {
      const villaIds = Array.from(
        new Set(
          items
            .map((r: any) => r.villa_id)
            .filter((x: any) => typeof x === "string" && x.length > 0),
        ),
      );

      if (villaIds.length > 0) {
        const { data: extra, error: extraErr } = await supa
          .from("villas")
          .select("id, province, district, neighborhood, bedrooms, bathrooms, capacity")
          .in("id", villaIds);

        if (extraErr) {
          console.warn("villa extra fields fetch error:", extraErr.message);
        } else {
          const byId = new Map((extra || []).map((v) => [v.id, v]));
          for (const row of items as any[]) {
            const base = byId.get(row.villa_id);
            if (!base) continue;
            if (row.province == null) row.province = base.province ?? null;
            if (row.district == null) row.district = base.district ?? null;
            if (row.neighborhood == null) row.neighborhood = base.neighborhood ?? null;
            if (row.bedrooms == null) row.bedrooms = base.bedrooms ?? null;
            if (row.bathrooms == null) row.bathrooms = base.bathrooms ?? null;
            if (row.capacity == null) row.capacity = base.capacity ?? null;
          }
        }
      }
    }

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    console.error("discount-villas error:", e?.message || e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
