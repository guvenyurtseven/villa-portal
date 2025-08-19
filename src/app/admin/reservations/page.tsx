import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Phone, User, Home } from "lucide-react";

export default async function AdminReservationsPage() {
  const supabase = createServiceRoleClient();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(
      `
      *,
      villa:villas(name, location)
    `,
    )
    .order("created_at", { ascending: false });

  // Tarih aralığını parse et
  function parseDateRange(dateRange: string): { start: string; end: string } {
    const match = dateRange.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
    if (match) {
      return { start: match[1], end: match[2] };
    }
    return { start: "", end: "" };
  }

  // Durum badge rengi
  function getStatusColor(status: string) {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  // Durum metni
  function getStatusText(status: string) {
    switch (status) {
      case "confirmed":
        return "Onaylandı";
      case "cancelled":
        return "İptal Edildi";
      default:
        return "Bekliyor";
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Rezervasyonlar</h1>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Rezervasyonlar yüklenirken hata oluştu: {error.message}</p>
          </CardContent>
        </Card>
      ) : reservations && reservations.length > 0 ? (
        <div className="grid gap-4">
          {reservations.map((reservation) => {
            const dates = parseDateRange(reservation.date_range);

            return (
              <Card key={reservation.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    {/* Sol Taraf - Rezervasyon Bilgileri */}
                    <div className="flex-1 space-y-3">
                      {/* Villa Bilgisi */}
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <Home className="h-5 w-5 text-gray-500" />
                        <span>{reservation.villa?.name}</span>
                        <span className="text-sm text-gray-500 font-normal">
                          ({reservation.villa?.location})
                        </span>
                      </div>

                      {/* Misafir Bilgileri */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{reservation.guest_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a
                            href={`mailto:${reservation.guest_email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {reservation.guest_email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a
                            href={`tel:${reservation.guest_phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {reservation.guest_phone}
                          </a>
                        </div>
                      </div>

                      {/* Tarih ve Fiyat */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {dates.start} - {dates.end}
                          </span>
                        </div>
                        <div className="font-bold text-lg">
                          ₺{reservation.total_price?.toLocaleString("tr-TR")}
                        </div>
                      </div>

                      {/* Notlar */}
                      {reservation.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          <span className="font-medium">Not:</span> {reservation.notes}
                        </div>
                      )}
                    </div>

                    {/* Sağ Taraf - Durum ve Aksiyonlar */}
                    <div className="flex flex-col items-end gap-3 ml-4">
                      <span
                        className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusColor(reservation.status)}`}
                      >
                        {getStatusText(reservation.status)}
                      </span>

                      {reservation.status === "pending" && (
                        <div className="flex gap-2">
                          <ReservationAction reservationId={reservation.id} action="confirm" />
                          <ReservationAction reservationId={reservation.id} action="cancel" />
                        </div>
                      )}

                      <span className="text-xs text-gray-400">
                        {new Date(reservation.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

// Client Component for Actions
function ReservationAction({
  reservationId,
  action,
}: {
  reservationId: string;
  action: "confirm" | "cancel";
}) {
  return (
    <form
      action={async () => {
        "use server";
        const supabase = createServiceRoleClient();
        await supabase
          .from("reservations")
          .update({ status: action === "confirm" ? "confirmed" : "cancelled" })
          .eq("id", reservationId);
      }}
    >
      <Button type="submit" size="sm" variant={action === "confirm" ? "default" : "destructive"}>
        {action === "confirm" ? "Onayla" : "İptal"}
      </Button>
    </form>
  );
}
