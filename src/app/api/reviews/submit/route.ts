// src/app/api/reviews/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      token, // zorunlu
      cleanliness_rating, // 1..5
      comfort_rating, // 1..5
      hospitality_rating, // 1..5
      comment, // zorunlu (metin)
      author_name, // opsiyonel (kısa ad)
    } = body ?? {};

    // ---- Basit doğrulamalar
    const cr = Number(cleanliness_rating);
    const co = Number(comfort_rating);
    const ho = Number(hospitality_rating);
    const text = typeof comment === "string" ? comment.trim() : "";

    const isValidStar = (n: number) => Number.isFinite(n) && n >= 1 && n <= 5;

    if (!token || !text || !isValidStar(cr) || !isValidStar(co) || !isValidStar(ho)) {
      return NextResponse.json({ error: "Eksik/Geçersiz veri" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // ---- 1) Token’ı sunucuda tekrar doğrula (SQL tarafında hazır RPC’n var)
    // validate_review_token(token_value := token) → { is_valid, error?, villa_id?, reservation_id?, ... }
    const { data: vres, error: verr } = await supabase
      .rpc("validate_review_token", { token_value: token })
      .single();

    if (verr || !vres || !vres.is_valid) {
      return NextResponse.json(
        { error: vres?.error || "Bağlantı geçersiz ya da süresi dolmuş" },
        { status: 400 },
      );
    }

    // ---- 2) Yorumu kaydet (tek rezervasyona tek yorum; reviews.access_token benzersiz)
    const { error: upErr } = await supabase
      .from("reviews")
      .update({
        cleanliness_rating: Math.round(cr),
        comfort_rating: Math.round(co),
        hospitality_rating: Math.round(ho),
        comment: text.slice(0, 5000),
        author_name:
          typeof author_name === "string" && author_name.trim()
            ? author_name.trim().slice(0, 120)
            : null,
        is_approved: true, // moderasyon istiyorsan false yap ve admin panelinden onayla
        token_used: true, // tek kullanımlık token kapat
      })
      .eq("access_token", token) // erişim token’ına göre tek satır güncellenecek
      .eq("token_used", false); // emniyet: zaten kullanılmış token’ı tekrar yazma

    if (upErr) {
      return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
    }

    // (İsteğe bağlı) Villa puan özeti fonksiyonunu invalidate etmek istersen burada RPC çağrısı yapabilirsin:
    // await supabase.rpc("get_villa_rating_summary", { villa_id_param: vres.villa_id });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
