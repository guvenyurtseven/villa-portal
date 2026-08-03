// src/app/api/admin/manual-reservation/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  reservationRpcErrorMessage,
  reservationRpcErrorStatus,
} from "@/domain/reservations/ReservationApiErrors";
import { addDaysToIsoDate, isoDateToUtcDate } from "@/lib/pgRange";
import { getErrorMessage } from "@/lib/errors";

const bodySchema = z.object({
  villa_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD (UI'de dahil)
  guest_name: z.string().min(1),
  guest_phone: z.string().min(1),
  guest_email: z.union([z.string().email(), z.literal("")]).optional().default(""),
  status: z.enum(["pending", "confirmed", "cancelled"]).default("confirmed"),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const supabase = createServiceRoleClient();
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Gecersiz veri", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // villa_total_price: check-in dahil, check-out hariç çalışır.
    // UI'den gelen end_date dahil olduğu için +1 gün ekleyip check-out yapıyoruz.
    const checkin = input.start_date;
    const startDate = isoDateToUtcDate(input.start_date);
    const endInclusiveDate = isoDateToUtcDate(input.end_date);
    const checkout = addDaysToIsoDate(input.end_date, 1);

    if (!startDate || !endInclusiveDate || !checkout || endInclusiveDate < startDate) {
      return NextResponse.json({ error: "Geçersiz tarih aralığı" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("create_reservation", {
      p_villa_id: input.villa_id,
      p_checkin: checkin,
      p_checkout: checkout,
      p_guest_name: input.guest_name,
      p_guest_phone: input.guest_phone,
      p_guest_email: input.guest_email || null,
      p_notes: input.notes ?? null,
      p_status: input.status,
    });

    if (error) {
      return NextResponse.json(
        { error: reservationRpcErrorMessage(error), details: error.message },
        { status: reservationRpcErrorStatus(error) },
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Beklenmeyen hata", details: getErrorMessage(err) },
      { status: 500 },
    );
  }
}
