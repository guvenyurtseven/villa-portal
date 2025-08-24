import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceRoleClient();

  // Sadece istenen 4 alanı çekiyoruz (Excel kolaylığı için başlıklarla)
  const { data, error } = await supabase
    .from("past_reservations")
    .select("guest_name,guest_phone,total_price,villa_name")
    .order("checkout_date", { ascending: false })
    .csv(); // <-- Supabase .csv()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filename = `gecmis_rezervasyonlar_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(data ?? "", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
