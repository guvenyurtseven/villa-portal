// src/app/api/admin/pending-reservations/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id, villa_id, date_range, guest_name, guest_email, guest_phone, notes, created_at,
      villa:villas(name,
        photos:villa_photos(url, is_primary, order_index)
      )
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Kapak foto/thumbnail seç
  const items = (data ?? []).map((r: any) => {
    const photos = Array.isArray(r.villa?.photos) ? r.villa.photos.slice() : [];
    photos.sort(
      (a: any, b: any) =>
        (b.is_primary ? 0 : 1) - (a.is_primary ? 0 : 1) ||
        (a.order_index ?? 999) - (b.order_index ?? 999),
    );
    return { ...r, cover_url: photos[0]?.url ?? null, villa_name: r.villa?.name ?? "-" };
  });

  return NextResponse.json({ items });
}
