import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { villa_id, start_date, end_date, guest_name, guest_phone, guest_email, status, notes } =
      body;

    const supabase = createServiceRoleClient();

    // Villa fiyatını al
    const { data: villa } = await supabase
      .from("villas")
      .select("weekly_price")
      .eq("id", villa_id)
      .single();

    // Fiyat hesapla
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const days = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(days / 7);
    const totalPrice = villa.weekly_price * weeks;

    // PostgreSQL daterange formatı
    const dateRange = `[${start_date},${end_date})`;

    // Rezervasyon oluştur
    const { data: reservation, error } = await supabase
      .from("reservations")
      .insert({
        villa_id,
        date_range: dateRange,
        guest_name,
        guest_phone,
        guest_email: guest_email || null,
        total_price: totalPrice,
        status: status || "confirmed",
        notes: notes || "Admin tarafından oluşturuldu",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23P01") {
        return NextResponse.json({ error: "Bu tarihler zaten dolu" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Manual reservation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
