import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getVillaCoverUrl } from "@/domain/villas/PhotoSorting";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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

  if (error || !data) {
    return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
  }

  const villa = Array.isArray(data.villa) ? data.villa[0] : data.villa;
  const photos = Array.isArray(villa?.photos) ? villa.photos.slice() : [];

  return NextResponse.json({
    ...data,
    villa_name: villa?.name ?? "-",
    cover_url: getVillaCoverUrl(photos),
  });
}
