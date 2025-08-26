import { createClient } from "@/lib/supabase/server";
import PhotoGallery from "@/components/site/PhotoGallery";
import FeaturesList from "@/components/site/FeaturesList";
import AvailabilityCalendar from "@/components/site/AvailabilityCalendar";
import MapModal from "@/components/site/MapModal";
import { notFound } from "next/navigation";
import VillaFeatures from "@/components/site/VillaFeatures";

interface VillaPageProps {
  params: Promise<{ id: string }>;
}

export default async function VillaPage({ params }: VillaPageProps) {
  // Next 15: params Promise olabilir → önce await!
  const { id } = await params;

  const supabase = await createClient();

  // Villa + fotoğraflar
  const { data: villa, error } = await supabase
    .from("villas")
    .select(
      `
      *,
      photos:villa_photos(id, url, is_primary, order_index)
    `,
    )
    .eq("id", id)
    .single();

  // Villa bulunamadı veya gizli ise 404
  if (error || !villa || villa.is_hidden) {
    notFound();
  }

  // Onaylı rezervasyonlar
  const { data: reservations } = await supabase
    .from("reservations")
    .select("date_range, status")
    .eq("villa_id", id)
    .eq("status", "confirmed");

  // Bloke tarihleri
  const { data: blockedDates } = await supabase
    .from("blocked_dates")
    .select("date_range, reason")
    .eq("villa_id", id);

  // Özel fiyat dönemleri
  const { data: pricingPeriods } = await supabase
    .from("villa_pricing_periods")
    .select("*")
    .eq("villa_id", id)
    .order("start_date", { ascending: true });

  // Müsait olmayan tarihleri formatla
  const unavailableRanges: Array<{
    start: string;
    end: string;
    type: "reserved";
  }> = [];

  const RANGE_RE = /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})[\)\]]$/;

  // Onaylı rezervasyonlar
  if (reservations) {
    reservations.forEach((r: any) => {
      const match = String(r.date_range ?? "").match(RANGE_RE);
      if (match) {
        unavailableRanges.push({
          start: match[1],
          end: match[2],
          type: "reserved",
        });
      }
    });
  }

  // Bloke tarihleri (temizlik vs.) — kullanıcı tarafında aynı davranır
  if (blockedDates) {
    blockedDates.forEach((block: any) => {
      const match = String(block.date_range ?? "").match(RANGE_RE);
      if (match) {
        unavailableRanges.push({
          start: match[1],
          end: match[2],
          type: "reserved",
        });
      }
    });
  }

  // --- FOTOĞRAFLAR: güvenli dizi ---
  const photosRaw: Array<{
    id?: string;
    url?: string | null;
    is_primary?: boolean | null;
    order_index?: number | null;
  }> = Array.isArray(villa.photos) ? villa.photos : [];

  const safePhotos = photosRaw
    // boş/bozuk URL'leri ele
    .filter((p) => typeof p?.url === "string" && p.url!.trim().length > 0)
    // sırala
    .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
    // galerinin beklediği forma getir
    .map((p) => ({
      id: p.id,
      url: p.url as string,
      alt: villa.name as string,
      is_primary: !!p.is_primary,
      order_index: Number(p.order_index ?? 0),
    }));

  const coverUrl = safePhotos[0]?.url || "/placeholder.jpg";

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{villa.name}</h1>
      {/* Fiyat gösterimi kaldırıldı */}
      <p className="text-gray-500 mt-1">Fiyat için tarih seçiniz</p>

      {/* Açıklama */}
      {villa.description && <p className="mt-4 text-gray-700">{villa.description}</p>}

      {/* Foto galeri */}
      <div className="mt-6">
        <PhotoGallery photos={safePhotos} />
      </div>

      {/* Özet özellikler (oda/banyo/havuz/mesafe) */}
      <FeaturesList
        bedrooms={villa.bedrooms}
        bathrooms={villa.bathrooms}
        pool={villa.has_pool}
        seaDistance={villa.sea_distance || "Belirtilmemiş"}
      />

      {/* Detaylı boolean özellikler */}
      <VillaFeatures villa={villa as any} className="mt-6" />

      {/* Konum Haritası */}
      {villa.lat != null && villa.lng != null && (
        <MapModal
          villaName={villa.name}
          coordinates={{
            lat: Number(villa.lat),
            lng: Number(villa.lng),
          }}
        />
      )}

      {/* Takvim + fiyat + form */}
      <AvailabilityCalendar
        unavailable={unavailableRanges}
        villaName={villa.name}
        villaImage={coverUrl}
        villaId={villa.id}
        pricingPeriods={pricingPeriods || []}
      />
    </main>
  );
}
