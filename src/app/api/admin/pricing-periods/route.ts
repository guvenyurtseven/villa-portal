import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getErrorCode } from "@/lib/errors";

const pricingPeriodSchema = z
  .object({
    villa_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nightly_price: z.coerce.number().finite().positive(),
  })
  .refine((value) => value.start_date <= value.end_date, {
    path: ["end_date"],
    message: "end_date start_date'ten once olamaz",
  });

/**
 * GET /api/admin/pricing-periods?villa_id=...
 * Belirli bir villa için fiyat dönemlerini getirir.
 */
export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
    if (getErrorCode(error) === "42P01") {
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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const parsed = pricingPeriodSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Gecersiz fiyat donemi", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { villa_id, start_date, end_date, nightly_price } = parsed.data;

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("villa_pricing_periods")
      .insert([{ villa_id, start_date, end_date, nightly_price }])
      .select()
      .single();

    // Exclusion constraint (tarihler çakışıyor) için daha okunur mesaj
    if (getErrorCode(error) === "23P01") {
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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
