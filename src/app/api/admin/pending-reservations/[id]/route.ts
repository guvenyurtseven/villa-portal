// src/app/api/admin/pending-reservations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, villa_id, date_range, guest_name, guest_email, guest_phone, total_price, notes, created_at,
      villa:villas(name,
        photos:villa_photos(url, is_primary, order_index)
      )
    `,
    )
    .eq("id", id)
    .eq("status", "pending")
    .single();
  if (error || !data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const photos = Array.isArray(data.villa?.photos) ? data.villa.photos.slice() : [];
  photos.sort(
    (a: any, b: any) =>
      (b.is_primary ? 0 : 1) - (a.is_primary ? 0 : 1) ||
      (a.order_index ?? 999) - (b.order_index ?? 999),
  );

  return NextResponse.json({
    ...data,
    villa_name: data.villa?.name ?? "-",
    cover_url: photos[0]?.url ?? null,
  });
}
