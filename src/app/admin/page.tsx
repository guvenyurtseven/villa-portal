import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Calendar, TrendingUp, Users } from "lucide-react";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const supabase = createServiceRoleClient();

  // İstatistikleri çek - service role kullanarak TÜM villaları say
  const [{ count: villaCount }, { count: reservationCount }, { data: recentReservations }] =
    await Promise.all([
      supabase.from("villas").select("*", { count: "exact", head: true }), // Tüm villalar
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed"),
      supabase
        .from("reservations")
        .select(
          `
        *,
        villa:villas(name, location)
      `,
        )
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Villa</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{villaCount || 0}</div>
            <p className="text-xs text-muted-foreground">Gizli villalar dahil</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Rezervasyon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservationCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Ay Gelir</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Müşteriler</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Son Rezervasyonlar */}
      <Card>
        <CardHeader>
          <CardTitle>Son Rezervasyonlar</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReservations && recentReservations.length > 0 ? (
            <div className="space-y-4">
              {recentReservations.map((reservation: any) => (
                <div
                  key={reservation.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{reservation.villa?.name}</p>
                    <p className="text-sm text-gray-500">
                      {reservation.guest_name} - {reservation.guest_email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₺{reservation.total_price}</p>
                    <p className="text-sm text-gray-500">{reservation.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Henüz rezervasyon bulunmamaktadır.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
