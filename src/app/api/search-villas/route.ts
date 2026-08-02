// src/app/api/search-villas/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addDays, format, parseISO } from "date-fns";
import { decodeSearchState } from "@/lib/shortlink";
import { isSearchableFeatureKey } from "@/domain/villas/FeatureCatalog";
import { getSortedVillaPhotoUrls } from "@/domain/villas/PhotoSorting";
import { toPgDateRange } from "@/lib/pgRange";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PhotoRow = { url: string; is_primary: boolean | null; order_index: number | null };
type VillaIdRow = { villa_id: string | null };
type PricingPeriodRow = {
  villa_id: string;
  start_date: string;
  end_date: string;
  nightly_price: number | string | null;
};
type SearchVillaRow = {
  id: string;
  name: string;
  capacity: number | null;
  priority: number | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  villa_photos?: PhotoRow[] | null;
};
type LocationColumn = "province" | "district" | "neighborhood";

function compactStringList(values: readonly unknown[]) {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function stateStringList(value: unknown) {
  return Array.isArray(value) ? compactStringList(value) : null;
}

function queryStringList(searchParams: URLSearchParams, key: string) {
  const csvValues = searchParams.get(key)?.split(",") ?? [];
  return compactStringList([...csvValues, ...searchParams.getAll(key)]);
}

function quotePostgrestInValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function makeLocationInFilter(column: LocationColumn, values: readonly string[]) {
  const quotedValues = Array.from(new Set(values)).map(quotePostgrestInValue);
  if (quotedValues.length === 0) return null;
  return `${column}.in.(${quotedValues.join(",")})`;
}

export async function GET(req: Request) {
  try {
    const supa = createServiceRoleClient();
    const { searchParams } = new URL(req.url);

    // --- (A) KISA PARAM: s ---
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

    const provinces = stateStringList(sState?.provinces) ?? queryStringList(searchParams, "province");
    const districts = stateStringList(sState?.districts) ?? queryStringList(searchParams, "district");
    const neighborhoods =
      stateStringList(sState?.neighborhoods) ?? queryStringList(searchParams, "neighborhood");
    const categorySlugs =
      stateStringList(sState?.categories) ?? queryStringList(searchParams, "category");

    const rawFeatureCsv = searchParams.get("feature");
    const featuresFromQs = compactStringList([
      ...(rawFeatureCsv ? rawFeatureCsv.split(",") : []),
      ...searchParams.getAll("feature"),
    ]);

    const wantedFeaturesRaw = stateStringList(sState?.features) ?? featuresFromQs;
    const wantedFeatures = Array.from(new Set(wantedFeaturesRaw.filter(isSearchableFeatureKey)));

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
    const rangeStr = toPgDateRange(checkin, endDate);

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
    const parts = [
      makeLocationInFilter("province", provinces),
      makeLocationInFilter("district", districts),
      makeLocationInFilter("neighborhood", neighborhoods),
    ].filter((part): part is string => part !== null);
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

    const baseVillaRows = baseVillas as SearchVillaRow[];
    const candidateIds = baseVillaRows.map((v) => v.id);

    // --- (2) Müsaitlik: confirmed rezervasyon / blokkaj çakışanı ele ---
    const [{ data: resv, error: resvErr }, { data: blks, error: blksErr }] = await Promise.all([
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
    if (resvErr) return NextResponse.json({ error: resvErr.message }, { status: 500 });
    if (blksErr) return NextResponse.json({ error: blksErr.message }, { status: 500 });
    const notAvailable = new Set<string>([
      ...compactStringList(((resv ?? []) as VillaIdRow[]).map((r) => r.villa_id)),
      ...compactStringList(((blks ?? []) as VillaIdRow[]).map((b) => b.villa_id)),
    ]);
    const available = baseVillaRows.filter((v) => !notAvailable.has(v.id));
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

    const byVilla = new Map<string, PricingPeriodRow[]>();
    for (const row of ((periods ?? []) as PricingPeriodRow[])) {
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
      .map((v) => {
        const photos: PhotoRow[] = v.villa_photos || [];
        const sorted = getSortedVillaPhotoUrls(photos);

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
  } catch (e: unknown) {
    console.error("search-villas error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
