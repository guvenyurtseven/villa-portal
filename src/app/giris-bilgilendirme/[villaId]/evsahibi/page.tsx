// src/app/giris-bilgilendirme/[villaId]/evsahibi/page.tsx
import { createServiceRoleClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatTRYOptional } from "@/lib/formatters";
import { parsePgDateRangeDatesOrNow } from "@/lib/pgRange";

// Bu sayfayı cache'leme; token & durum anlık olmalı
export const revalidate = 0;
export const dynamic = "force-dynamic";

// Arama parametreleri Next 15'te Promise!
type SearchParams = Record<string, string | string[] | undefined>;
type RelationOne<T> = T | T[] | null | undefined;
type OwnerPortalReservation = {
  id: string;
  status: string | null;
  date_range: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  total_price: number | null;
  villa?: {
    id: string;
    name: string | null;
    cleaning_fee: number | null;
    province: string | null;
    district: string | null;
    neighborhood: string | null;
  } | null;
};

function firstRelation<T>(value: RelationOne<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

// SEO: Bu sayfa indekslenmesin
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function OwnerPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ villaId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { villaId } = await params;
  const sp = await searchParams;
  const token = typeof sp?.t === "string" ? sp.t : Array.isArray(sp?.t) ? sp.t[0] : "";

  if (!token || !villaId) {
    return <Denied reason="Bağlantı geçersiz." />;
  }

  const supabase = createServiceRoleClient();

  // Token doğrula: token + villa eşleşmeli, süresi geçmemeli
  const nowIso = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("owner_portal_tokens")
    .select(
      `
      token,
      expires_at,
      reservation:reservations(
        id,
        status,
        date_range,
        guest_name,
        guest_email,
        guest_phone,
        total_price,
        villa:villas(
          id,
          name,
          cleaning_fee,
          province,
          district,
          neighborhood
        )
      )
    `,
    )
    .eq("token", token)
    .eq("villa_id", villaId)
    .gt("expires_at", nowIso)
    .single();

  const r = firstRelation(row?.reservation as RelationOne<OwnerPortalReservation>);

  if (error || !r) {
    // Token yok / yanlış / süresi geçmiş
    return <Denied reason="Bağlantı süresi dolmuş ya da geçersiz." />;
  }

  if (r.status !== "confirmed") {
    // Rezervasyon onaylı değilse erişim verme
    return <Denied reason="Rezervasyon onaylanmamış." />;
  }

  // Tarih bilgilerini hesapla
  const { startDate, endExclusiveDate, nights } = parsePgDateRangeDatesOrNow(
    String(r.date_range || ""),
  );

  // Görsel içerik
  const toplam = formatTRYOptional(Number(r.total_price));
  const temizlik = formatTRYOptional(Number(r.villa?.cleaning_fee ?? 0));
  const adres = [r.villa?.province, r.villa?.district, r.villa?.neighborhood]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-1">{r.villa?.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">Giriş Bilgilendirme — Ev Sahibi</p>

      <div className="grid gap-4">
        {/* Rezervasyon Özeti */}
        <section className="rounded border p-4">
          <h2 className="font-medium mb-2">Rezervasyon Bilgileri</h2>
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <b>Giriş:</b> {startDate.toLocaleDateString("tr-TR")}
            </div>
            <div>
              <b>Çıkış:</b> {endExclusiveDate.toLocaleDateString("tr-TR")}
            </div>
            <div>
              <b>Gece:</b> {nights}
            </div>
            <div>
              <b>Toplam:</b> {toplam ?? "—"}
            </div>
            <div>
              <b>Temizlik Ücreti:</b> {temizlik ?? "—"}
            </div>
          </div>
        </section>

        {/* Misafir İletişim */}
        <section className="rounded border p-4">
          <h2 className="font-medium mb-2">Misafir İletişim</h2>
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <b>Ad Soyad:</b> {r.guest_name ?? "—"}
            </div>
            <div>
              <b>Telefon:</b> {r.guest_phone ?? "—"}{" "}
              {r.guest_phone && (
                <Link
                  target="_blank"
                  className="underline ml-1"
                  href={`https://wa.me/${String(r.guest_phone).replace(/\D/g, "")}`}
                >
                  WhatsApp
                </Link>
              )}
            </div>
            <div>
              <b>E-posta:</b> {r.guest_email ?? "—"}
            </div>
          </div>
        </section>

        {/* Konum */}
        <section className="rounded border p-4">
          <h2 className="font-medium mb-2">Konum</h2>
          <div className="text-sm">{adres || "—"}</div>
        </section>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Bu sayfa süreli bir bağlantı ile görüntülenmektedir. Lütfen üçüncü kişilerle paylaşmayınız.
      </p>
    </div>
  );
}

function Denied({ reason }: { reason: string }) {
  // İstersen burada notFound() çağırıp 404 gösterebilirsin; ben mesaj döndürüyorum.
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-3">Erişim reddedildi</h1>
      <p className="text-sm">{reason}</p>
    </div>
  );
}
