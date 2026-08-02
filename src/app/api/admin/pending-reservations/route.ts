// src/app/api/admin/pending-reservations/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getVillaCoverUrl } from "@/domain/villas/PhotoSorting";

type RelationOne<T> = T | T[] | null | undefined;
type PendingReservationRow = {
  id: string;
  villa_id: string | null;
  date_range: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  notes: string | null;
  created_at: string | null;
  villa?: RelationOne<{
    name: string | null;
    photos?: { url: string | null; is_primary: boolean | null; order_index: number | null }[] | null;
  }>;
};

function firstRelation<T>(value: RelationOne<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
  const items = ((data ?? []) as PendingReservationRow[]).map((r) => {
    const villa = firstRelation(r.villa);
    const photos = Array.isArray(villa?.photos) ? villa.photos.slice() : [];
    return { ...r, cover_url: getVillaCoverUrl(photos), villa_name: villa?.name ?? "-" };
  });

  return NextResponse.json({ items });
}
