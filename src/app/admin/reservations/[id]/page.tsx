import { createServiceRoleClient } from "@/lib/supabase/server";
import { displayPgDateRange } from "@/lib/pgRange";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import CancelReservationButton from "@/components/admin/CancelReservationButton";

export const dynamic = "force-dynamic"; // cache'e yapışmasın
export const revalidate = 0;

function isUuidLike(s: string | undefined) {
  if (!s) return false;
  // İzinli: 36 haneli UUID (v4 gibi), tireli biçim
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s,
  );
}

export default async function ReservationDetailPage(props: {
  params: Promise<{ id?: string }>; // Next 15: async params
}) {
  const { id } = await props.params;

  // Geçersiz/boş id gelirse listeye dön
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
      villas ( id, name ),
      total_price
    `,
    )
    .eq("id", id!)
    .single();

  if (error || !data) {
    // Burada da kullanıcıyı listeye döndürmek daha iyi bir UX
    redirect("/admin/reservations");
  }

  const rangeText = displayPgDateRange(data.date_range);

  async function cancelReservation(id: string) {
    "use server";
    // server action ile API'yi çağırmak istersen:
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/admin/reservations/${id}/cancel`,
      {
        method: "POST",
        cache: "no-store",
      },
    );
    if (!res.ok) {
      throw new Error("İptal sırasında hata oluştu");
    }
  }

  // Sayfa bileşenin içinde, reservation yüklendikten sonra:
  const isCancelled = data.status === "cancelled";

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rezervasyon Detayı</h1>
        {!isCancelled && <CancelReservationButton id={data.id} />}

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/reservations">Listeye Dön</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/admin/villas/${data.villa_id}/calendar`}>Takvimi Aç</Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border border-gray-200 bg-white">
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Villa" value={data.villas?.name ?? "—"} />
            <Field label="Durum" value={statusLabel(data.status)} pill />
            <Field label="Müşteri Adı" value={data.guest_name} />
            <Field label="Telefon" value={data.guest_phone} />
            <Field label="E‑posta" value={data.guest_email || "—"} />
            <Field label="Tarih Aralığı" value={rangeText} />
            <Field
              label="Toplam Ücret"
              value={
                data.total_price != null
                  ? `${Number(data.total_price).toLocaleString("tr-TR")} ₺`
                  : "—"
              }
            />
            <Field label="Oluşturulma" value={new Date(data.created_at).toLocaleString("tr-TR")} />
          </div>

          {data.notes && (
            <div className="mt-6">
              <div className="text-sm font-medium text-gray-700 mb-1">Notlar</div>
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
        <span className="inline-block mt-1 px-3 py-1 text-xs rounded-full bg-gray-100">
          {value}
        </span>
      ) : (
        <div className="text-sm mt-1">{value}</div>
      )}
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "confirmed":
      return "Onaylandı";
    case "cancelled":
      return "İptal";
    default:
      return "Bekliyor";
  }
}
