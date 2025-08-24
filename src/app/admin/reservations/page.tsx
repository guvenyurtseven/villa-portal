import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Phone, User, Home, MapPin } from "lucide-react";
import Link from "next/link";

export default async function AdminReservationsPage() {
  const supabase = createServiceRoleClient();

  // Tüm villaları rezervasyonlarıyla birlikte çek
  const { data: villas, error } = await supabase
    .from("villas")
    .select(
      `
      id,
      name,
      reservations(
        id,
        date_range,
        guest_name,
        guest_email,
        guest_phone,
        total_price,
        status,
        notes,
        created_at
      )
    `,
    )
    .order("name");

  function parseDateRange(dateRange: string): { start: string; end: string } {
    const match = dateRange.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
    if (match) {
      return { start: match[1], end: match[2] };
    }
    return { start: "", end: "" };
  }

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

  function getStatusText(status: string) {
    switch (status) {
      case "confirmed":
        return "Onaylandı";
      case "cancelled":
        return "İptal";
      default:
        return "Bekliyor";
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Tüm Rezervasyonlar</h1>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Veriler yüklenirken hata oluştu</p>
          </CardContent>
        </Card>
      ) : villas && villas.length > 0 ? (
        <div className="space-y-6">
          {villas.map((villa) => {
            const hasReservations = villa.reservations && villa.reservations.length > 0;

            return (
              <Card key={villa.id}>
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        {villa.name}
                      </CardTitle>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/villas/${villa.id}/calendar`}>Takvimi Yönet</Link>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {hasReservations ? (
                    <div className="space-y-3">
                      {villa.reservations
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                        )
                        .map((reservation) => {
                          const dates = parseDateRange(reservation.date_range);

                          return (
                            <div
                              key={reservation.id}
                              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 space-y-2">
                                  {/* Müşteri Bilgileri */}
                                  <div className="flex items-start gap-4">
                                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div>
                                      <p className="font-semibold">{reservation.guest_name}</p>
                                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                        <span className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {reservation.guest_phone}
                                        </span>
                                        {reservation.guest_email && (
                                          <span className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {reservation.guest_email}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tarih ve Fiyat */}
                                  <div className="flex items-center gap-6 text-sm">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      {dates.start} → {dates.end}
                                    </span>
                                    <span className="font-bold">
                                      ₺{reservation.total_price?.toLocaleString("tr-TR")}
                                    </span>
                                  </div>

                                  {/* Notlar */}
                                  {reservation.notes && (
                                    <p className="text-sm text-gray-600 italic">
                                      Not: {reservation.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Durum */}
                                <div className="text-right">
                                  <span
                                    className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(reservation.status)}`}
                                  >
                                    {getStatusText(reservation.status)}
                                  </span>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {new Date(reservation.created_at).toLocaleDateString("tr-TR")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Bu villa için henüz rezervasyon bulunmuyor
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Sistemde henüz villa bulunmuyor</p>
            <Button asChild className="mt-4">
              <Link href="/admin/villas/new">İlk Villayı Ekle</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
