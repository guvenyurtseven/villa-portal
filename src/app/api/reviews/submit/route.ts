import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      token,
      cleanliness_rating,
      comfort_rating,
      hospitality_rating,
      comment,
      // author_name, // <-- ŞEMADA YOK: kesinlikle payload'a koymuyoruz
    } = body ?? {};

    const cr = Number(cleanliness_rating);
    const co = Number(comfort_rating);
    const ho = Number(hospitality_rating);
    const text = typeof comment === "string" ? comment.trim() : "";

    if (!token || !Number.isFinite(cr) || !Number.isFinite(co) || !Number.isFinite(ho) || !text) {
      return NextResponse.json({ error: "Eksik/Geçersiz veri" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1) Token doğrulama (DB fonksiyonu)
    const { data: vres, error: verr } = await supabase
      .rpc("validate_review_token", { token_value: token })
      .single();

    if (verr || !vres || !vres.is_valid) {
      console.error("validate_review_token error:", verr || vres?.error);
      return NextResponse.json({ error: vres?.error || "Bağlantı geçersiz" }, { status: 400 });
    }

    // 2) Şemaya UYGUN update payload (reviews tablosu: *_rating alanları var)
    const payload: Record<string, any> = {
      cleanliness_rating: Math.max(1, Math.min(5, cr)),
      comfort_rating: Math.max(1, Math.min(5, co)),
      hospitality_rating: Math.max(1, Math.min(5, ho)),
      comment: text.slice(0, 5000),
      is_approved: false, // moderasyon istiyorsan burada false başlat
      token_used: true,
    };

    const { error: upErr } = await supabase
      .from("reviews")
      .update(payload)
      .eq("access_token", token); // UUID kolonda string ile karşılaştırma Supabase-js ile doğrudur.

    if (upErr) {
      console.error("reviews.update error:", upErr);
      return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("reviews/submit fatal:", e?.message || e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
