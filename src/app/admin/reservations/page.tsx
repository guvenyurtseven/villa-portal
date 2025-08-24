import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Phone, User, Home } from "lucide-react";
import Link from "next/link";

type SearchParams = Promise<{ q?: string }>;

export default async function AdminReservationsPage(props: { searchParams: SearchParams }) {
  const supabase = createServiceRoleClient();
  const { q } = await props.searchParams;
  const qRaw = (q || "").trim();

  function parseDateRangeInclusive(dateRange: string): { start: string; endInclusive: string } {
    const m = dateRange.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
    if (!m) return { start: "", endInclusive: "" };
    const start = m[1];
    const endExclusive = m[2];
    const d = new Date(endExclusive + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return { start, endInclusive: d.toISOString().slice(0, 10) };
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

  // ===================== ARAMA MODU =====================
  if (qRaw) {
    const phoneQ = qRaw.replace(/[^\d+]/g, "");

    // 1) Müşteri adı / telefonuna göre rezervasyonlar
    const ors: string[] = [`guest_name.ilike.%${qRaw}%`, `guest_phone.ilike.%${qRaw}%`];
    if (phoneQ.length >= 7) {
      ors.push(`guest_phone.eq.${phoneQ}`);
    }

    const baseSelect = `
      id, date_range, guest_name, guest_phone, status, created_at,
      villas!inner(id, name)
    `;

    const qGuests = supabase
      .from("reservations")
      .select(baseSelect)
      .or(ors.join(","))
      .order("created_at", { ascending: false })
      .limit(300);

    // 2) Villa adına göre önce villa_id'leri bul
    const villasByName = await supabase
      .from("villas")
      .select("id, name")
      .ilike("name", `%${qRaw}%`)
      .limit(300);

    let qVillas: PromiseLike<{ data: any[] | null; error: any }> | null = null;

    if (!villasByName.error && villasByName.data && villasByName.data.length > 0) {
      const ids = villasByName.data.map((v) => v.id);
      qVillas = supabase
        .from("reservations")
        .select(baseSelect)
        .in("villa_id", ids)
        .order("created_at", { ascending: false })
        .limit(300);
    }

    const [rGuests, rVillas] = await Promise.all([
      qGuests,
      qVillas ?? Promise.resolve({ data: [], error: null }),
    ]);

    if (rGuests.error || rVillas?.error) {
      return (
        <div>
          <h1 className="text-3xl font-bold mb-4">Rezervasyonlar</h1>
          <SearchBar defaultValue={qRaw} />
          <p className="text-red-600 mt-6">Arama sırasında hata oluştu.</p>
        </div>
      );
    }

    // 3) İki sonucu id bazında tekilleştir + sırala
    const map = new Map<string, any>();
    (rGuests.data ?? []).forEach((r) => map.set(r.id, r));
    (rVillas?.data ?? []).forEach((r) => map.set(r.id, r));
    const data = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Rezervasyonlar</h1>
        <SearchBar defaultValue={qRaw} />
        {data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-6">
            {data.map((r: any) => {
              const dates = parseDateRangeInclusive(r.date_range);
              return (
                <Link
                  key={r.id}
                  href={`/admin/reservations/${r.id}`}
                  className="block rounded-2xl border border-gray-200 hover:shadow-md transition p-4 bg-white"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">{r.villas?.name ?? "—"}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                      {getStatusText(r.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{r.guest_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{r.guest_phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {dates.start} → {dates.endInclusive}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 mt-6">Sonuç bulunamadı.</p>
        )}
      </div>
    );
  }

  // ===================== VARSAYILAN MOD =====================
  const { data: villas, error } = await supabase
    .from("villas")
    .select(
      `
      id, name,
      reservations(id, date_range, guest_name, guest_email, guest_phone, total_price, status, notes, created_at)
    `,
    )
    .order("name");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Tüm Rezervasyonlar</h1>
      <div className="flex items-center justify-end  px-8 py-8">
        <Link
          href="/api/admin/past-reservations/export"
          className="rounded-lg bg-emerald-600 text-white px-3 py-3 hover:bg-emerald-700 transition"
        >
          Geçmiş rezervasyonları indir
        </Link>
      </div>
      <SearchBar />
      {error ? (
        <p className="text-red-600 mt-6">Veriler yüklenirken hata oluştu</p>
      ) : villas && villas.length > 0 ? (
        <div className="space-y-6 mt-6">
          {villas.map((villa: any) => {
            const hasReservations = villa.reservations && villa.reservations.length > 0;
            return (
              <Card key={villa.id}>
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" /> {villa.name}
                    </CardTitle>
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
                          (a: any, b: any) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                        )
                        .map((reservation: any) => {
                          const dates = parseDateRangeInclusive(reservation.date_range);
                          return (
                            <Link
                              key={reservation.id}
                              href={`/admin/reservations/${reservation.id}`}
                              className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 space-y-2">
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
                                  <div className="flex items-center gap-6 text-sm">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      {dates.start} → {dates.endInclusive}
                                    </span>
                                    <span className="font-bold">
                                      ₺{reservation.total_price?.toLocaleString("tr-TR")}
                                    </span>
                                  </div>
                                  {reservation.notes && (
                                    <p className="text-sm text-gray-600 italic">
                                      Not: {reservation.notes}
                                    </p>
                                  )}
                                </div>
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
                            </Link>
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
        <p className="text-gray-500 mt-6">Sistemde henüz villa bulunmuyor</p>
      )}
    </div>
  );
}

function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form method="GET" className="mb-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={defaultValue}
          placeholder="Müşteri adı, telefon veya villa adı... Örn: +905462711279"
          className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {defaultValue && (
          <Link href="/admin/reservations" className="text-sm text-gray-500 hover:underline">
            Temizle
          </Link>
        )}
      </div>
    </form>
  );
}
