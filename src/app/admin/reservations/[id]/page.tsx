import Link from "next/link";
import { redirect } from "next/navigation";
import CancelReservationButton from "@/components/admin/CancelReservationButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  canCancelReservation,
  reservationStatusLabel,
} from "@/domain/reservations/ReservationStatus";
import { displayPgDateRange } from "@/lib/pgRange";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReservationRow = {
  id: string;
  villa_id: string;
  date_range: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  total_price: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  villas: { id: string; name: string } | { id: string; name: string }[] | null;
};

function isUuidLike(value: string | undefined) {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;

  if (!isUuidLike(id)) {
    redirect("/admin/reservations");
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      id,
      villa_id,
      date_range,
      guest_name,
      guest_email,
      guest_phone,
      total_price,
      status,
      notes,
      created_at,
      villas ( id, name )
    `,
    )
    .eq("id", id as string)
    .single<ReservationRow>();

  if (error || !data) {
    redirect("/admin/reservations");
  }

  const villaName = Array.isArray(data.villas) ? data.villas[0]?.name : data.villas?.name;
  const rangeText = displayPgDateRange(data.date_range);
  const isCancellable = canCancelReservation(data.status);

  return (
    <main className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rezervasyon Detayi</h1>
        {isCancellable && <CancelReservationButton id={data.id} />}

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/reservations">Listeye Don</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/admin/villas/${data.villa_id}/calendar`}>Takvimi Ac</Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border border-gray-200 bg-white">
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Villa" value={villaName ?? "-"} />
            <Field label="Durum" value={reservationStatusLabel(data.status)} pill />
            <Field label="Musteri Adi" value={data.guest_name ?? "-"} />
            <Field label="Telefon" value={data.guest_phone ?? "-"} />
            <Field label="E-posta" value={data.guest_email ?? "-"} />
            <Field label="Tarih Araligi" value={rangeText} />
            <Field
              label="Toplam Ucret"
              value={
                data.total_price != null
                  ? `${Number(data.total_price).toLocaleString("tr-TR")} TL`
                  : "-"
              }
            />
            <Field label="Olusturulma" value={new Date(data.created_at).toLocaleString("tr-TR")} />
          </div>

          {data.notes && (
            <div className="mt-6">
              <div className="mb-1 text-sm font-medium text-gray-700">Notlar</div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm">{data.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
function Field({ label, value, pill = false }: { label: string; value: string; pill?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      {pill ? (
        <span className="mt-1 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs">{value}</span>
      ) : (
        <div className="mt-1 text-sm">{value}</div>
      )}
    </div>
  );
}
