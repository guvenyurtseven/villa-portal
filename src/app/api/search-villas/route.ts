// src/app/api/search-villas/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addDays, format, parseISO } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Yardımcı: [YYYY-MM-DD, YYYY-MM-DD) biçiminde range string
function mkRange(start: string, end: string) {
  // Postgres daterange ']' yerine ')' kullanır: başlangıç dahil, bitiş hariç.
  return `[${start},${end})`;
}

type PhotoRow = { url: string; is_primary: boolean | null; order_index: number | null };

export async function GET(req: Request) {
  try {
    const supa = createServiceRoleClient();
    const { searchParams } = new URL(req.url);

    // --- Parametreleri al ---
    const provinces = searchParams.getAll("province").filter(Boolean);
    const districts = searchParams.getAll("district").filter(Boolean);
    const neighborhoods = searchParams.getAll("neighborhood").filter(Boolean);

    const checkin = searchParams.get("checkin") || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const nights = Math.max(1, Math.min(60, Number(searchParams.get("nights") || 7)));
    const guests = Math.max(1, Math.min(21, Number(searchParams.get("guests") || 2)));

    // checkout = checkin + nights
    const endDate = format(addDays(parseISO(checkin), nights), "yyyy-MM-dd");
    const rangeStr = mkRange(checkin, endDate);

    // --- 1) Aday villaları çek (konum + kapasite + hidden=false) ---
    // Not: OR mantığı için PostgREST 'or' filtresini stringle kuruyoruz
    let orFilter = "";
    const parts: string[] = [];
    if (provinces.length > 0)
      parts.push(`province.in.(${provinces.map((v) => `"${v}"`).join(",")})`);
    if (districts.length > 0)
      parts.push(`district.in.(${districts.map((v) => `"${v}"`).join(",")})`);
    if (neighborhoods.length > 0)
      parts.push(`neighborhood.in.(${neighborhoods.map((v) => `"${v}"`).join(",")})`);
    if (parts.length > 0) orFilter = parts.join(",");

    let q = supa
      .from("villas")
      .select(
        `
        id, name, capacity, priority,
        province, district, neighborhood,
        bedrooms, bathrooms,
        villa_photos(url, is_primary, order_index)
      `,
      )
      .eq("is_hidden", false)
      .gte("capacity", guests);

    if (orFilter) {
      // OR: province/district/neighborhood seçeneklerinden herhangi biri tutarsa dahil
      // @ts-ignore supabase-js .or signature string alır
      q = q.or(orFilter);
    }

    const { data: baseVillas, error: baseErr } = await q;
    if (baseErr) {
      return NextResponse.json({ error: baseErr.message }, { status: 500 });
    }

    if (!baseVillas || baseVillas.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const candidateIds = baseVillas.map((v) => v.id);

    // --- 2) Müsaitlik kontrolü: rezervasyon veya blokaj ile çakışanları ele ---
    const [{ data: resv }, { data: blks }] = await Promise.all([
      supa
        .from("reservations")
        .select("villa_id")
        .eq("status", "confirmed")
        .in("villa_id", candidateIds)
        .overlaps("date_range", rangeStr),
      supa
        .from("blocked_dates")
        .select("villa_id")
        .in("villa_id", candidateIds)
        .overlaps("date_range", rangeStr),
    ]);

    const notAvailable = new Set<string>([
      ...(resv?.map((r: any) => r.villa_id) || []),
      ...(blks?.map((b: any) => b.villa_id) || []),
    ]);

    const available = baseVillas.filter((v) => !notAvailable.has(v.id));
    if (available.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const availIds = available.map((v) => v.id);

    // --- 3) Fiyat kapsamı kontrolü: aralıktaki her gün için fiyat tanımı şart ---
    const { data: periods, error: pErr } = await supa
      .from("villa_pricing_periods")
      .select("villa_id, start_date, end_date, nightly_price")
      .in("villa_id", availIds);

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    // villa_id -> dönem listesi
    const byVilla = new Map<string, any[]>();
    for (const row of periods || []) {
      const arr = byVilla.get(row.villa_id) || [];
      arr.push(row);
      byVilla.set(row.villa_id, arr);
    }

    function hasFullCoverage(villaId: string) {
      const ps = byVilla.get(villaId) || [];
      if (ps.length === 0) return false;
      let cur = parseISO(checkin);
      for (let i = 0; i < nights; i++) {
        const covered = ps.some((p) => {
          const s = parseISO(p.start_date);
          const e = parseISO(p.end_date);
          return cur >= s && cur <= e;
        });
        if (!covered) return false;
        cur = addDays(cur, 1);
      }
      return true;
    }

    const priced = available.filter((v) => hasFullCoverage(v.id));
    if (priced.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // --- 4) Çıkış: priority DESC ile sıralı; primaryPhoto hazırla ---
    const items = priced
      .map((v) => {
        const photos: PhotoRow[] = (v as any).villa_photos || [];
        const sorted = photos
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
          capacity: v.capacity,
          priority: (v as any).priority ?? 0,
          province: (v as any).province ?? null,
          district: (v as any).district ?? null,
          neighborhood: (v as any).neighborhood ?? null,
          bedrooms: (v as any).bedrooms ?? null,
          bathrooms: (v as any).bathrooms ?? null,
          primaryPhoto: sorted[0] || null,
          images: sorted.slice(0, 8),
        };
      })
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("search-villas error:", e?.message || e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
