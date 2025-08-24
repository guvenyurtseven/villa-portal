// src/app/api/admin/manual-reservation/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  villa_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD (UI'de dahil)
  guest_name: z.string().min(1),
  guest_phone: z.string().min(1),
  guest_email: z.string().optional().default(""),
  status: z.enum(["pending", "confirmed", "cancelled"]).default("confirmed"),
  notes: z.string().optional().nullable(),
});

function toPgDateRangeInclusive(start: string, endInclusive: string) {
  // [start, endExclusive)
  const end = new Date(endInclusive);
  end.setDate(end.getDate() + 1);
  const endExclusive = end.toISOString().slice(0, 10);
  return `[${start},${endExclusive})`;
}

export async function POST(req: Request) {
  try {
    const supabase = createServiceRoleClient();
    const json = await req.json();
    const input = bodySchema.parse(json);

    // villa_total_price: check-in dahil, check-out hariç çalışır.
    // UI'den gelen end_date dahil olduğu için +1 gün ekleyip check-out yapıyoruz.
    const checkin = input.start_date;
    const checkoutDate = new Date(input.end_date);
    checkoutDate.setDate(checkoutDate.getDate() + 1);
    const checkout = checkoutDate.toISOString().slice(0, 10);

    // Toplam ücreti RPC ile hesapla (fiyat dönemlerini dikkate alır)
    const { data: totalPrice, error: rpcError } = await supabase.rpc("villa_total_price", {
      p_villa_id: input.villa_id,
      p_checkin: checkin,
      p_checkout: checkout,
    });

    if (rpcError) {
      console.error("[manual-reservation] villa_total_price error:", rpcError);
      return NextResponse.json(
        { error: "Fiyat hesaplanamadı", details: rpcError.message },
        { status: 500 },
      );
    }

    const date_range = toPgDateRangeInclusive(input.start_date, input.end_date);

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        villa_id: input.villa_id,
        date_range,
        guest_name: input.guest_name,
        guest_phone: input.guest_phone,
        guest_email: input.guest_email || null,
        total_price: totalPrice, // RPC sonucu
        status: input.status,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Beklenmeyen hata", details: err?.message }, { status: 500 });
  }
}
