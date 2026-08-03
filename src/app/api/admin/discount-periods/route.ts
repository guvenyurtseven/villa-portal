import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getErrorCode } from "@/lib/errors";

const discountPeriodSchema = z
  .object({
    villa_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nightly_price: z.coerce.number().finite().positive(),
    priority: z.coerce.number().int().min(1).max(10),
  })
  .refine((value) => value.start_date <= value.end_date, {
    path: ["end_date"],
    message: "end_date start_date'ten once olamaz",
  });

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

/**
 * GET /api/admin/discount-periods?villa_id=...
 * Belirli villanın indirim dönemlerini listeler (tarihe göre).
 */
export async function GET(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const villa_id = searchParams.get("villa_id");
  if (!villa_id) return bad("villa_id zorunludur");

  const supa = createServiceRoleClient();
  const { data, error } = await supa
    .from("villa_discount_periods")
    .select("*")
    .eq("villa_id", villa_id)
    .order("start_date", { ascending: true });

  if (error) return bad(error.message, 500);
  return NextResponse.json({ periods: data ?? [] });
}

/**
 * POST /api/admin/discount-periods
 * Body: { villa_id, start_date, end_date, nightly_price, priority }
 */
export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const raw = await req.json();
  const parsed = discountPeriodSchema.safeParse({
    villa_id: raw?.villa_id ?? raw?.villaId,
    start_date: raw?.start_date ?? raw?.startDate,
    end_date: raw?.end_date ?? raw?.endDate,
    nightly_price: raw?.nightly_price ?? raw?.nightlyPrice,
    priority: raw?.priority,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Gecersiz indirim donemi", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { villa_id, start_date, end_date, nightly_price, priority } = parsed.data;

  const supa = createServiceRoleClient();

  const { data, error } = await supa
    .from("villa_discount_periods")
    .insert([{ villa_id, start_date, end_date, nightly_price, priority }])
    .select("*")
    .single();

  if (error) {
    // 23P01 = exclusion violation (çakışma)
    if (getErrorCode(error) === "23P01") {
      return bad("Seçilen tarih aralığı, mevcut bir indirim dönemiyle çakışıyor.", 409);
    }
    return bad(error.message, 500);
  }

  return NextResponse.json({ period: data }, { status: 201 });
}

/**
 * DELETE /api/admin/discount-periods?id=...
 */
export async function DELETE(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return bad("id zorunludur");

  const supa = createServiceRoleClient();
  const { error } = await supa.from("villa_discount_periods").delete().eq("id", id);
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true }, { status: 200 });
}
