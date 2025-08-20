import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { auth } from "@/lib/auth";

// Supabase client oluştur
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET - Villa'ya ait fiyat dönemlerini getir
export async function GET(request: NextRequest) {
  try {
    // Admin kontrolü
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const villa_id = searchParams.get("villa_id");

    if (!villa_id) {
      return NextResponse.json({ error: "villa_id parametresi gerekli" }, { status: 400 });
    }

    // villa_pricing_periods tablosundan verileri çek
    const { data, error } = await supabase
      .from("villa_pricing_periods")
      .select("*")
      .eq("villa_id", villa_id)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Fiyat dönemleri alınamadı", details: error.message },
        { status: 500 },
      );
    }

    // Frontend'in beklediği formatta dön
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("GET /api/admin/pricing-periods error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST - Yeni fiyat dönemi ekle
export async function POST(request: NextRequest) {
  try {
    // Admin kontrolü
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { villa_id, start_date, end_date, nightly_price } = body;

    // Validasyon
    if (!villa_id || !start_date || !end_date || !nightly_price) {
      return NextResponse.json({ error: "Tüm alanlar zorunludur" }, { status: 400 });
    }

    // Tarih kontrolü
    if (new Date(start_date) >= new Date(end_date)) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalı" },
        { status: 400 },
      );
    }

    // Yeni fiyat dönemi ekle
    const { data, error } = await supabase
      .from("villa_pricing_periods")
      .insert({
        villa_id,
        start_date,
        end_date,
        nightly_price: parseFloat(nightly_price),
      })
      .select()
      .single();

    if (error) {
      // EXCLUDE constraint hatası - tarih çakışması
      if (error.code === "23P01" || error.message?.includes("exclusion")) {
        return NextResponse.json(
          { error: "Bu tarih aralığı başka bir dönemle çakışıyor" },
          { status: 409 },
        );
      }

      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Fiyat dönemi eklenemedi", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/pricing-periods error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE - Fiyat dönemini sil
export async function DELETE(request: NextRequest) {
  try {
    // Admin kontrolü
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID parametresi gerekli" }, { status: 400 });
    }

    const { error } = await supabase.from("villa_pricing_periods").delete().eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Fiyat dönemi silinemedi", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fiyat dönemi başarıyla silindi",
    });
  } catch (error) {
    console.error("DELETE /api/admin/pricing-periods error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
