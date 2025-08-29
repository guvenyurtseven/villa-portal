// src/app/api/locations/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/locations?q=kal
export async function GET(req: Request) {
  try {
    const supa = createServiceRoleClient();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    // Tek sorguda gerekli sütunları çekip Node tarafında uniq'liyoruz
    const { data, error } = await supa.from("villas").select("province, district, neighborhood");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const provinces = new Set<string>();
    const districts = new Set<string>();
    const neighborhoods = new Set<string>();

    for (const row of data ?? []) {
      if (row.province) provinces.add(row.province);
      if (row.district) districts.add(row.district);
      if (row.neighborhood) neighborhoods.add(row.neighborhood);
    }

    const toList = (set: Set<string>) => Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));

    const p = toList(provinces);
    const d = toList(districts);
    const n = toList(neighborhoods);

    // Autocomplete seçenekleri (tek listede)
    let options = [
      ...p.map((v) => ({ type: "province" as const, value: v, label: v })),
      ...d.map((v) => ({ type: "district" as const, value: v, label: v })),
      ...n.map((v) => ({ type: "neighborhood" as const, value: v, label: v })),
    ];

    if (q) {
      options = options.filter((o) => o.label.toLowerCase().includes(q));
    }

    return NextResponse.json({
      provinces: p,
      districts: d,
      neighborhoods: n,
      options,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "internal error" }, { status: 500 });
  }
}
