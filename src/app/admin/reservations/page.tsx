import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminReservationsPage() {
  const supabase = await createClient();

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      `
      *,
      villa:villas(name, location)
    `,
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Rezervasyonlar</h1>

      {reservations && reservations.length > 0 ? (
        <div className="grid gap-4">
          {reservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardContent className="p-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{reservation.villa?.name}</h3>
                    <p className="text-gray-500">{reservation.guest_name}</p>
                    <p className="text-sm">{reservation.guest_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₺{reservation.total_price}</p>
                    <p className="text-sm text-gray-500">{reservation.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Henüz rezervasyon bulunmamaktadır.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
