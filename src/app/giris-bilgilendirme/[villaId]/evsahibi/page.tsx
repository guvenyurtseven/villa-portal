// src/app/giris-bilgilendirme/[villaId]/evsahibi/page.tsx
import { createServiceRoleClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

// Bu sayfayı cache'leme; token & durum anlık olmalı
export const revalidate = 0;
export const dynamic = "force-dynamic";

// Arama parametreleri Next 15'te Promise!
type SearchParams = Record<string, string | string[] | undefined>;

// SEO: Bu sayfa indekslenmesin
export const metadata = {
  robots: { index: false, follow: false },
};

function fmtTRY(n?: number | null) {
  if (typeof n !== "number") return undefined;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

function parseDateRange(rangeStr: string) {
  // PostgreSQL daterange kanonik form: [YYYY-MM-DD,YYYY-MM-DD)
  const m = rangeStr?.match(/^\[?(\d{4}-\d{2}-\d{2}).*?,\s*(\d{4}-\d{2}-\d{2})/);
  const start = m ? new Date(m[1] + "T00:00:00Z") : new Date();
  const end = m ? new Date(m[2] + "T00:00:00Z") : new Date();
  const nights = Math.max(1, Math.round((+end - +start) / 86_400_000));
  return { start, end, nights };
}

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

  if (error || !row?.reservation) {
    // Token yok / yanlış / süresi geçmiş
    return <Denied reason="Bağlantı süresi dolmuş ya da geçersiz." />;
  }

  const r = row.reservation as any;

  if (r.status !== "confirmed") {
    // Rezervasyon onaylı değilse erişim verme
    return <Denied reason="Rezervasyon onaylanmamış." />;
  }

  // Tarih bilgilerini hesapla
  const { start, end, nights } = parseDateRange(String(r.date_range || ""));

  // Görsel içerik
  const toplam = fmtTRY(Number(r.total_price));
  const temizlik = fmtTRY(Number(r.villa?.cleaning_fee ?? 0));
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
              <b>Giriş:</b> {start.toLocaleDateString("tr-TR")}
            </div>
            <div>
              <b>Çıkış:</b> {end.toLocaleDateString("tr-TR")}
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
