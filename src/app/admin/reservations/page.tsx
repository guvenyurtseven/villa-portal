import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar, Mail, Phone, User, Home } from "lucide-react";
import Link from "next/link";
import {
  reservationStatusColor,
  reservationStatusLabel,
} from "@/domain/reservations/ReservationStatus";
import { parsePgDateRangeInclusive } from "@/lib/pgRange";

type SearchParams = Promise<{ q?: string }>;
type RelationOne<T> = T | T[] | null | undefined;
type ReservationSearchRow = {
  id: string;
  date_range: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  status: string | null;
  created_at: string | null;
  villas?: RelationOne<{ id: string; name: string | null }>;
};

type ReservationListRow = {
  id: string;
  date_range: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  total_price: number | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
};

type VillaReservationsRow = {
  id: string;
  name: string;
  reservations?: ReservationListRow[] | null;
};

function firstRelation<T>(value: RelationOne<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function AdminReservationsPage(props: { searchParams: SearchParams }) {
  const supabase = createServiceRoleClient();
  const { q } = await props.searchParams;
  const qRaw = (q || "").trim();

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

    let qVillas: PromiseLike<{ data: unknown; error: unknown }> | null = null;

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
          <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Rezervasyonlar</h1>
          <SearchBar defaultValue={qRaw} />
          <p className="text-red-600 mt-6">Arama sırasında hata oluştu.</p>
        </div>
      );
    }

    // 3) İki sonucu id bazında tekilleştir + sırala
    const guestRows = (rGuests.data ?? []) as ReservationSearchRow[];
    const villaRows = (rVillas?.data ?? []) as ReservationSearchRow[];
    const map = new Map<string, ReservationSearchRow>();
    guestRows.forEach((r) => map.set(r.id, r));
    villaRows.forEach((r) => map.set(r.id, r));
    const data = Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );

    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Rezervasyonlar</h1>
        <SearchBar defaultValue={qRaw} />
        {data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-6">
            {data.map((r) => {
              const villa = firstRelation(r.villas);
              const dates = parsePgDateRangeInclusive(r.date_range) ?? {
                start: "",
                endInclusive: "",
              };
              return (
                <Link
                  key={r.id}
                  href={`/admin/reservations/${r.id}`}
                  className="block rounded-2xl border border-gray-200 hover:shadow-md transition p-4 bg-white"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="min-w-0 text-lg font-semibold">{villa?.name ?? "—"}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                      {reservationStatusLabel(r.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{r.guest_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="min-w-0 truncate">{r.guest_phone}</span>
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
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Tüm Rezervasyonlar</h1>
      <div className="mb-4 flex items-center justify-start sm:justify-end">
        <Link
          href="/api/admin/past-reservations/export"
          className={buttonVariants({ variant: "success", size: "lg" })}
        >
          Geçmiş rezervasyonları indir
        </Link>
      </div>
      <SearchBar />
      {error ? (
        <p className="text-red-600 mt-6">Veriler yüklenirken hata oluştu</p>
      ) : villas && villas.length > 0 ? (
        <div className="space-y-6 mt-6">
          {((villas ?? []) as VillaReservationsRow[]).map((villa) => {
            const reservations = villa.reservations ?? [];
            const hasReservations = reservations.length > 0;
            return (
              <Card key={villa.id}>
                <CardHeader className="bg-gray-50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex min-w-0 items-center gap-2">
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
                      {reservations
                        .sort(
                          (a: ReservationListRow, b: ReservationListRow) =>
                            new Date(b.created_at ?? 0).getTime() -
                            new Date(a.created_at ?? 0).getTime(),
                        )
                        .map((reservation) => {
                          const dates = parsePgDateRangeInclusive(reservation.date_range) ?? {
                            start: "",
                            endInclusive: "",
                          };
                          return (
                            <Link
                              key={reservation.id}
                              href={`/admin/reservations/${reservation.id}`}
                              className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start gap-4">
                                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div>
                                      <p className="font-semibold">{reservation.guest_name}</p>
                                      <div className="mt-1 flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                                        <span className="flex min-w-0 items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          <span className="truncate">{reservation.guest_phone}</span>
                                        </span>
                                        {reservation.guest_email && (
                                          <span className="flex min-w-0 items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate">{reservation.guest_email}</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
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
                                <div className="shrink-0 sm:text-right">
                                  <span
                                    className={`px-3 py-1 text-xs rounded-full font-medium ${reservationStatusColor(reservation.status)}`}
                                  >
                                    {reservationStatusLabel(reservation.status)}
                                  </span>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {reservation.created_at
                                      ? new Date(reservation.created_at).toLocaleDateString("tr-TR")
                                      : "-"}
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          name="q"
          defaultValue={defaultValue}
          placeholder="Müşteri adı, telefon veya villa adı... Örn: +905462711279"
          className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          Ara
        </Button>
        {defaultValue && (
          <Link href="/admin/reservations" className="text-center text-sm text-gray-500 hover:underline sm:text-left">
            Temizle
          </Link>
        )}
      </div>
    </form>
  );
}
