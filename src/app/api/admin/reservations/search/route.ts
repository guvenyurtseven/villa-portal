import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

type RelationOne<T> = T | T[] | null | undefined;
type ReservationSearchRow = {
  id: string;
  villa_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  date_range: string | null;
  status: string | null;
  created_at: string | null;
  villas?: RelationOne<{ id: string; name: string | null }>;
};

function firstRelation<T>(value: RelationOne<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function GET(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // reservations + villas join (villa ismine göre filtreleyebilmek için)
  let query = supabaseAdmin
    .from("reservations")
    .select(
      `
      id, guest_name, guest_phone, date_range, status, created_at, villa_id,
      villas!inner ( id, name )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    // telefon numarası gibi görünüyorsa eşitlik denemesi de yapalım
    const phoneQ = q.replace(/[^\d+]/g, "");
    const ors = [`guest_name.ilike.%${q}%`, `guest_phone.ilike.%${q}%`, `villas.name.ilike.%${q}%`];
    if (phoneQ.length >= 7) {
      ors.push(`guest_phone.eq.${phoneQ}`);
    }
    query = query.or(ors.join(","));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = ((data ?? []) as ReservationSearchRow[]).map((r) => ({
    id: r.id,
    villaId: r.villa_id,
    villaName: firstRelation(r.villas)?.name ?? "—",
    guestName: r.guest_name,
    guestPhone: r.guest_phone,
    dateRange: r.date_range, // client'ta insan okunur forma dönüştüreceğiz
    status: r.status,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ results });
}
