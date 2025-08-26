// src/app/api/calculate-price/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sunucu tarafında Supabase client.
 * - Anon anahtar (public işlemler)
 * - Service role anahtarı (RLS'i aşan güvenli sunucu işlemleri)
 * Bu endpoint sadece fiyat hesaplar (veri yazmaz) ama hesaplama
 * için fonksiyon/tablolar üzerindeki RLS/policy karmaşasını önlemek adına
 * service role kullanıyoruz. Anahtar asla client'a sızmaz.
 */
function getSupabase(service = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = service
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * from/to (ISO) arasında gece sayısı (UTC farkı baz alınır).
 * Not: SQL fonksiyonlarına yyyy-mm-dd formatı geçeceğimiz için
 * burada tam-gün farkı işimizi görür.
 */
function diffNightsUTC(fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * İsteğin beklenen gövdesi:
 * {
 *   "villaId": "uuid",
 *   "from": "2025-09-22T21:00:00.000Z",
 *   "to":   "2025-09-29T21:00:00.000Z"
 * }
 *
 * Yanıt:
 * {
 *   nights: number,
 *   base_total: number,
 *   cleaning_fee: number,
 *   cleaning_fee_applied: boolean,
 *   short_stay: boolean,
 *   total: number,
 *   deposit: number          // (opsiyonel: %35 depozito)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const villaId: string | undefined = body?.villaId;
    const fromISO: string | undefined = body?.from;
    const toISO: string | undefined = body?.to;

    if (!villaId || !fromISO || !toISO) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const nights = diffNightsUTC(fromISO, toISO);
    if (!Number.isFinite(nights) || nights <= 0) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }

    // --- 1) Baz toplamı hesapla ---
    // Tercihen SQL fonksiyonları (villa_daily_prices / villa_total_price)
    // kullanılır. Günlüklerin toplamını alıyoruz.
    const supa = getSupabase(true);

    const checkin = fromISO.slice(0, 10); // "YYYY-MM-DD"
    const checkout = toISO.slice(0, 10); // "YYYY-MM-DD"

    // Günlük fiyatlar
    const { data: dailyRows, error: dailyErr } = await supa.rpc("villa_daily_prices", {
      p_villa_id: villaId,
      p_checkin: checkin,
      p_checkout: checkout,
    });

    if (dailyErr) {
      // İç detayı log'la, kullanıcıya generic hata ver
      console.error("villa_daily_prices error:", dailyErr);
      return NextResponse.json({ error: "calc_failed" }, { status: 400 });
    }

    const base_total = (Array.isArray(dailyRows) ? dailyRows : []).reduce(
      (acc: number, row: any) => acc + Number(row?.nightly_price ?? 0),
      0,
    );

    // --- 2) < 7 gece için temizlik ücreti ekle ---
    let cleaning_fee = 0;
    let cleaning_fee_applied = false;
    const short_stay = nights < 7;

    if (short_stay) {
      const { data: villa, error: villaErr } = await supa
        .from("villas")
        .select("cleaning_fee")
        .eq("id", villaId)
        .single();

      if (villaErr) {
        console.error("fetch cleaning_fee error:", villaErr);
        return NextResponse.json({ error: "calc_failed" }, { status: 400 });
      }

      cleaning_fee = Math.max(0, Number(villa?.cleaning_fee ?? 0));
      if (cleaning_fee > 0) cleaning_fee_applied = true;
    }

    const total = base_total + cleaning_fee;

    // (Opsiyonel) %35 depozito hesabı – mevcut UI buna göre çalışıyorsa döndürmek faydalı
    const depositRate = 0.35;
    const deposit = Math.round(total * depositRate);

    return NextResponse.json(
      {
        nights,
        base_total,
        cleaning_fee,
        cleaning_fee_applied,
        short_stay,
        total,
        deposit,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("calculate-price fatal error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
