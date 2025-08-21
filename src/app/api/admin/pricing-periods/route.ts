import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/pricing-periods?villa_id=...
 * Belirli bir villa için fiyat dönemlerini getirir.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villa_id = searchParams.get("villa_id");

    if (!villa_id) {
      return NextResponse.json({ error: "Villa ID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("villa_pricing_periods")
      .select("*")
      .eq("villa_id", villa_id)
      .order("start_date", { ascending: true });

    // Tablo yoksa PostgREST 42P01 döndürebilir; UI kırılmasın diye boş dizi dön.
    // (Tablonun doğru adı: villa_pricing_periods)
    // Şeman: Villa Pricing Periods with Date Range Exclusion.txt
    if ((error as any)?.code === "42P01") {
      return NextResponse.json([]);
    }

    if (error) {
      console.error("Pricing periods fetch error:", error);
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/pricing-periods
 * Body: { villa_id, start_date, end_date, nightly_price }
 * Yeni fiyat dönemi ekler.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { villa_id, start_date, end_date, nightly_price } = body ?? {};

    if (!villa_id || !start_date || !end_date || nightly_price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("villa_pricing_periods")
      .insert([{ villa_id, start_date, end_date, nightly_price }])
      .select()
      .single();

    // Exclusion constraint (tarihler çakışıyor) için daha okunur mesaj
    if ((error as any)?.code === "23P01") {
      return NextResponse.json(
        { error: "Bu villada seçilen tarih aralığı başka bir fiyat dönemiyle çakışıyor." },
        { status: 409 },
      );
    }

    if (error) {
      console.error("Pricing period creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/pricing-periods?id=...
 * Belirli bir fiyat dönemini siler.
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("villa_pricing_periods").delete().eq("id", id);

    if (error) {
      console.error("Delete pricing period error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
