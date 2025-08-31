// src/app/api/search-villas/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addDays, format, parseISO } from "date-fns";
import { encodeSearchState, decodeSearchState, SearchState } from "@/lib/shortlink";
import LZString from "lz-string"; // (tree-shake için direkt import da mümkün)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// daterange helper: [start, end)
function mkRange(start: string, end: string) {
  return `[${start},${end})`;
}

type PhotoRow = { url: string; is_primary: boolean | null; order_index: number | null };

// Villas tablosundaki boolean kolonlar (allowlist)
const ALLOWED_FEATURES = [
  "private_pool",
  "heated_pool",
  "indoor_pool",
  "sheltered_pool",
  "jacuzzi",
  "sauna",
  "hammam",
  "fireplace",
  "pet_friendly",
  "internet",
  "master_bathroom",
  "children_pool",
  "in_site",
  "playground",
  "billiards",
  "table_tennis",
  "foosball",
  "underfloor_heating",
  "generator",
] as const;

export async function GET(req: Request) {
  try {
    const supa = createServiceRoleClient();
    const { searchParams } = new URL(req.url);

    // --- (A) KISA PARAM: s ---
    const sParam = searchParams.get("s");
    const sState = decodeSearchState(searchParams.get("s")); // yoksa null

    // --- (B) Paramları oku (s varsa öncelik sState'te) ---
    const checkin =
      (sState?.checkin as string) ||
      searchParams.get("checkin") ||
      new Date().toISOString().slice(0, 10);

    const nights = Math.max(
      1,
      Math.min(60, Number(sState?.nights ?? searchParams.get("nights") ?? 7)),
    );
    const guests = Math.max(
      1,
      Math.min(21, Number(sState?.guests ?? searchParams.get("guests") ?? 2)),
    );

    const provinces =
      sState?.provinces ??
      (searchParams.get("province")?.split(",").filter(Boolean) ?? [])
        .concat(searchParams.getAll("province"))
        .filter(Boolean);

    const districts =
      sState?.districts ??
      (searchParams.get("district")?.split(",").filter(Boolean) ?? [])
        .concat(searchParams.getAll("district"))
        .filter(Boolean);

    const neighborhoods =
      sState?.neighborhoods ??
      (searchParams.get("neighborhood")?.split(",").filter(Boolean) ?? [])
        .concat(searchParams.getAll("neighborhood"))
        .filter(Boolean);

    const categorySlugs =
      sState?.categories ??
      (searchParams.get("category")?.split(",").filter(Boolean) ?? [])
        .concat(searchParams.getAll("category"))
        .filter(Boolean);

    const rawFeatureCsv = searchParams.get("feature");
    const featuresFromQs = (rawFeatureCsv ? rawFeatureCsv.split(",") : [])
      .concat(searchParams.getAll("feature"))
      .filter(Boolean);

    const wantedFeaturesRaw = sState?.features ?? featuresFromQs;
    const wantedFeatures = Array.from(
      new Set(wantedFeaturesRaw.filter((k) => (ALLOWED_FEATURES as readonly string[]).includes(k))),
    );

    const priceMin =
      Number(
        sState?.price_min ?? searchParams.get("price_min") ?? searchParams.get("minPrice") ?? "0",
      ) || 0;

    const priceMax =
      Number(
        sState?.price_max ??
          searchParams.get("price_max") ??
          searchParams.get("maxPrice") ??
          "99999999",
      ) || 99999999;

    const endDate = format(addDays(parseISO(checkin), nights), "yyyy-MM-dd");
    const rangeStr = mkRange(checkin, endDate);

    // --- (0) Kategori slug → villa_id eşleşmesi (varsa) ---
    let categoryVillaIds: string[] | null = null;
    if (categorySlugs.length > 0) {
      const { data: cats, error: catErr } = await supa
        .from("categories")
        .select("id, slug")
        .in("slug", categorySlugs);
      if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });

      const catIds = (cats || []).map((c) => c.id);
      if (catIds.length === 0) return NextResponse.json({ items: [] });

      const { data: vc, error: vcErr } = await supa
        .from("villa_categories")
        .select("villa_id, category_id")
        .in("category_id", catIds);
      if (vcErr) return NextResponse.json({ error: vcErr.message }, { status: 500 });

      categoryVillaIds = Array.from(new Set((vc || []).map((r) => r.villa_id)));
      if (categoryVillaIds.length === 0) return NextResponse.json({ items: [] });
    }

    // --- (1) Aday villalar ---
    let orFilter = "";
    const parts: string[] = [];
    if (provinces.length > 0)
      parts.push(`province.in.(${provinces.map((v) => `"${v}"`).join(",")})`);
    if (districts.length > 0)
      parts.push(`district.in.(${districts.map((v) => `"${v}"`).join(",")})`);
    if (neighborhoods.length > 0)
      parts.push(`neighborhood.in.(${neighborhoods.map((v) => `"${v}"`).join(",")})`);
    if (parts.length > 0) orFilter = parts.join(",");

    let base = supa
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
      // @ts-ignore supabase-js .or() string kabul eder
      base = base.or(orFilter);
    }
    if (categoryVillaIds) {
      base = base.in("id", categoryVillaIds);
    }

    // ÖZELLİK FİLTRESİ (AND)
    for (const f of wantedFeatures) base = base.eq(f, true);

    const { data: baseVillas, error: baseErr } = await base;
    if (baseErr) return NextResponse.json({ error: baseErr.message }, { status: 500 });
    if (!baseVillas || baseVillas.length === 0) return NextResponse.json({ items: [] });

    const candidateIds = baseVillas.map((v) => v.id);

    // --- (2) Müsaitlik: confirmed rezervasyon / blokkaj çakışanı ele ---
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
    if (available.length === 0) return NextResponse.json({ items: [] });

    // --- (3) Fiyat kapsama: her gün için period + min/max ---
    const availIds = available.map((v) => v.id);
    const { data: periods, error: pErr } = await supa
      .from("villa_pricing_periods")
      .select("villa_id, start_date, end_date, nightly_price")
      .in("villa_id", availIds)
      .gte("nightly_price", priceMin)
      .lte("nightly_price", priceMax);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

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
          if (!(cur >= s && cur <= e)) return false;
          const price = Number(p.nightly_price);
          if (Number.isFinite(price)) {
            if (price < priceMin || price > priceMax) return false;
          }
          return true;
        });
        if (!covered) return false;
        cur = addDays(cur, 1);
      }
      return true;
    }

    const priced = available.filter((v) => hasFullCoverage(v.id));
    if (priced.length === 0) return NextResponse.json({ items: [] });

    // --- (4) Çıkış ---
    const items = priced
      .map((v: any) => {
        const photos: PhotoRow[] = v.villa_photos || [];
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
          priority: v.priority ?? 0,
          province: v.province ?? null,
          district: v.district ?? null,
          neighborhood: v.neighborhood ?? null,
          bedrooms: v.bedrooms ?? null,
          bathrooms: v.bathrooms ?? null,
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
