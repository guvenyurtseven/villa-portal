// src/app/api/opportunity-villas/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  addDays,
  format,
  parseISO,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  max as dateMax,
  min as dateMin,
} from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PricingPeriod = {
  start_date: string;
  end_date: string;
  nightly_price: number;
};

type PhotoRow = { url: string; is_primary: boolean | null; order_index: number | null };

type VillaRow = {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  capacity: number | null;
  priority: number | null;
  villa_photos: PhotoRow[] | null;
};

type BusyRange = { start: string; end: string }; // [start, end) ISO yyyy-MM-dd
type Gap = {
  startDate: string; // check-in (prev checkout)
  endDate: string; // check-out (next check-in) — DÜZELTİLDİ
  nights: number;
  totalPrice: number | null;
  nightlyPrice: number | null;
};

const RANGE_RE = /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})[)\]]$/;

// Konfigürasyon
const WINDOW_DAYS = 60; // bugünden itibaren bakılacak ufuk
const MIN_NIGHTS = 2;
const MAX_NIGHTS = 7;

function parsePgRange(r: string | null | undefined): BusyRange | null {
  if (!r) return null;
  const m = String(r).match(RANGE_RE);
  if (!m) return null;
  const [_, s, e] = m;
  return { start: s, end: e }; // Postgres daterange varsayılanı [start, end)
}

function mergeOverlaps(ranges: BusyRange[]): BusyRange[] {
  if (ranges.length <= 1) return ranges.slice();
  const sorted = ranges
    .slice()
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  const out: BusyRange[] = [];
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const nxt = sorted[i];
    // cur: [cur.start, cur.end)  nxt: [nxt.start, nxt.end)
    if (nxt.start <= cur.end) {
      // ÇAKIŞIYOR veya bitişik — birleşir
      cur.end = cur.end > nxt.end ? cur.end : nxt.end;
    } else {
      out.push(cur);
      cur = { ...nxt };
    }
  }
  out.push(cur);
  return out;
}

function gapBetween(a: BusyRange, b: BusyRange): BusyRange | null {
  // a.end .. b.start arası boşluk
  if (a.end >= b.start) return null;
  // [start, end) — tam istenen: giriş = önceki checkout, çıkış = sonraki check-in
  return { start: a.end, end: b.start };
}

function clampToWindow(r: BusyRange, winStart: Date, winEnd: Date): BusyRange | null {
  const rs = parseISO(r.start);
  const re = parseISO(r.end);
  // boş veya tamamen dışarıdaysa yok say
  if (isAfter(rs, winEnd) || isBefore(re, winStart) || rs >= re) return null;
  const s = dateMax([rs, winStart]);
  const e = dateMin([re, winEnd]);
  if (s >= e) return null;
  return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
}

function countNights(gap: BusyRange): number {
  return Math.max(0, differenceInCalendarDays(parseISO(gap.end), parseISO(gap.start)));
}

function priceCoverageSum(
  periods: PricingPeriod[],
  gap: BusyRange,
): { ok: boolean; total: number } {
  if (!periods || periods.length === 0) return { ok: false, total: 0 };
  let cur = parseISO(gap.start);
  const end = parseISO(gap.end);
  let total = 0;
  while (cur < end) {
    const covered = periods.find((p) => {
      const ps = parseISO(p.start_date);
      const pe = parseISO(p.end_date);
      return cur >= ps && cur <= pe;
    });
    if (!covered) return { ok: false, total: 0 };
    total += Number(covered.nightly_price);
    cur = addDays(cur, 1);
  }
  return { ok: true, total };
}

export async function GET() {
  try {
    const supa = createServiceRoleClient();

    const today = new Date();
    const winStart = today;
    const winEnd = addDays(today, WINDOW_DAYS);

    // 1) Aday villalar
    const { data: villas, error: vErr } = await supa
      .from("villas")
      .select(
        `
        id, name, province, district, neighborhood, capacity, priority,
        villa_photos(url, is_primary, order_index)
      `,
      )
      .eq("is_hidden", false)
      .order("priority", { ascending: false })
      .order("id", { ascending: false })
      .limit(24);

    if (vErr) {
      console.error("villas error:", vErr);
      return NextResponse.json([]);
    }
    if (!villas || villas.length === 0) return NextResponse.json([]);

    const villaIds = villas.map((v) => v.id);

    // 2) Rezervasyonlar + blokkajlar + fiyat dönemleri
    const [resv, blks, priceRows] = await Promise.all([
      supa
        .from("reservations")
        .select("villa_id, date_range")
        .eq("status", "confirmed")
        .in("villa_id", villaIds),
      supa.from("blocked_dates").select("villa_id, date_range").in("villa_id", villaIds),
      supa
        .from("villa_pricing_periods")
        .select("villa_id, start_date, end_date, nightly_price")
        .in("villa_id", villaIds),
    ]);

    const byVillaBusy: Record<string, BusyRange[]> = {};
    (resv.data || []).forEach((r: any) => {
      const pr = parsePgRange(r.date_range);
      if (pr) (byVillaBusy[r.villa_id] ||= []).push(pr);
    });
    (blks.data || []).forEach((b: any) => {
      const pr = parsePgRange(b.date_range);
      if (pr) (byVillaBusy[b.villa_id] ||= []).push(pr);
    });

    const byVillaPrices: Record<string, PricingPeriod[]> = {};
    (priceRows.data || []).forEach((p: any) => {
      (byVillaPrices[p.villa_id] ||= []).push({
        start_date: p.start_date,
        end_date: p.end_date,
        nightly_price: Number(p.nightly_price),
      });
    });

    // 3) Fırsat boşlukları
    const out: Array<{
      id: string;
      name: string;
      province: string | null;
      district: string | null;
      neighborhood: string | null;
      images: string[];
      opportunities: Gap[];
      priority: number | null;
      capacity: number | null;
    }> = [];

    for (const v of villas as VillaRow[]) {
      const busyRaw = mergeOverlaps((byVillaBusy[v.id] || []).map((r) => r));

      // pencereye göre kıs
      const busy = busyRaw
        .map((r) => clampToWindow(r, winStart, winEnd))
        .filter((x): x is BusyRange => !!x);

      // sentinel aralıklar (pencere sınırları)
      const sentinelStart: BusyRange = {
        start: format(winStart, "yyyy-MM-dd"),
        end: format(winStart, "yyyy-MM-dd"),
      };
      const sentinelEnd: BusyRange = {
        start: format(winEnd, "yyyy-MM-dd"),
        end: format(winEnd, "yyyy-MM-dd"),
      };
      const timeline = [sentinelStart, ...busy, sentinelEnd].sort((a, b) =>
        a.start < b.start ? -1 : a.start > b.start ? 1 : 0,
      );
      const merged = mergeOverlaps(timeline);

      const gaps: Gap[] = [];
      for (let i = 0; i < merged.length - 1; i++) {
        const a = merged[i];
        const b = merged[i + 1];
        const gap = gapBetween(a, b); // [a.end, b.start)
        if (!gap) continue;

        const nights = countNights(gap);
        if (nights < MIN_NIGHTS || nights > MAX_NIGHTS) continue;

        const prices = byVillaPrices[v.id] || [];
        const { ok, total } = priceCoverageSum(prices, gap);
        if (!ok) continue;

        gaps.push({
          startDate: gap.start, // GİRİŞ = önceki rezervasyonun checkout’u
          endDate: gap.end, // ÇIKIŞ = sonraki rezervasyonun check-in’i (DÜZELTİLDİ)
          nights,
          totalPrice: total,
          nightlyPrice: Math.round(total / nights),
        });
      }

      if (gaps.length > 0) {
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

        out.push({
          id: v.id,
          name: v.name,
          province: v.province,
          district: v.district,
          neighborhood: v.neighborhood,
          images: sorted.slice(0, 6),
          opportunities: gaps,
          priority: v.priority ?? null,
          capacity: v.capacity ?? null,
        });
      }
    }

    // İstersen priority/nights/tarih kriterleriyle ekstra sıralama yapılabilir
    out.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return NextResponse.json(out);
  } catch (err) {
    console.error("opportunity-villas error:", err);
    return NextResponse.json([]);
  }
}
