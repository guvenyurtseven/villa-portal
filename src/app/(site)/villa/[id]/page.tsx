import { createClient } from "@/lib/supabase/server";
import FeaturesList from "@/components/site/FeaturesList";
import AvailabilityCalendar from "@/components/site/AvailabilityCalendar";
import MapModal from "@/components/site/MapModal";
import { notFound } from "next/navigation";
import VillaFeatures from "@/components/site/VillaFeatures";
import OpportunityPeriods from "@/components/site/OpportunityPeriods";
import { Users, BedDouble, Droplet } from "lucide-react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import GalleryLightbox from "@/components/site/GalleryLightbox";
import {
  buildBusyRangesFromDateRangeRows,
  calculatePublicDetailOpportunities,
  type OpportunityDateRangeRow,
  type OpportunityPricingPeriod,
} from "@/domain/opportunities/OpportunityCalculator";

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
  const { data: discountPeriods } = await supabase
    .from("villa_discount_periods")
    .select("*")
    .eq("villa_id", id)
    .order("start_date", { ascending: true });

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

  const reservationRows = (reservations ?? []) as OpportunityDateRangeRow[];
  const blockedDateRows = (blockedDates ?? []) as OpportunityDateRangeRow[];
  const busyRanges = buildBusyRangesFromDateRangeRows([...reservationRows, ...blockedDateRows]);
  const unavailableRanges = busyRanges.map((range) => ({
    start: range.start,
    end: range.endExclusive,
    type: "reserved" as const,
  }));

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

  const opportunities = calculatePublicDetailOpportunities({
    busyRanges,
    pricingPeriods: (pricingPeriods ?? []) as OpportunityPricingPeriod[],
    minNights: 2,
    maxNights: 7,
  });
  const locationStr = [villa.province, villa.district, villa.neighborhood]
    .filter(Boolean)
    .join(" / ");

  return (
    <>
      {/* HERO: Tam genişlik kapak görseli + overlay başlık/konum + "Resimlere Bak" */}
      <section
        className="
          relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]
          h-[56vh] min-h-[320px] max-h-[720px]
        "
        aria-label="Kapak görseli"
      >
        <div className="absolute inset-0 z-index-100">
          {/* Next Image fill + object-cover (resmi yatayda tam yay) */}
          {/* Docs: Image fill & object-fit */}
          <Image
            src={coverUrl}
            alt={villa.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* üst ve alt yumuşak gradient overlay (okunabilirlik) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        </div>

        {/* Ortalanmış başlık/konum */}
        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-start justify-center px-4 sm:px-6">
          <h1 className="text-white drop-shadow-md font-bold text-3xl sm:text-4xl md:text-5xl">
            {villa.name}
          </h1>
          {locationStr && (
            <p className="mt-3 inline-flex items-center gap-2 text-white/95 drop-shadow">
              <MapPin className="h-5 w-5" />
              <span className="text-base sm:text-lg md:text-xl">{locationStr}</span>
            </p>
          )}
        </div>

        {/* Sağ altta "Resimlere Bak" butonu */}
        <div className="absolute inset-x-4 bottom-4 z-10 flex justify-end sm:inset-x-6 sm:bottom-6">
          <GalleryLightbox photos={safePhotos} className="max-w-full" />
        </div>

        {/* Örnek: Sertifika rozeti istersen sol üstte göster */}
        {villa.document_number && (
          <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-md bg-orange-500/95 px-3 py-1.5 text-xs text-white sm:left-6 sm:top-6">
            Belge No: {villa.document_number}
          </div>
        )}

        {/* Kapasite / Yatak / Özel Havuz satırı */}
        <div className="hidden">
          {typeof villa.capacity === "number" && (
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <Users className="h-4 w-4" />
              <span className="text-sm">{villa.capacity} Kişi</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-gray-700">
            <BedDouble className="h-4 w-4" />
            <span className="text-sm">{villa.bedrooms} Yatak Odası</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-700">
            <Droplet className="h-4 w-4" />
            <span className="text-sm">{villa.has_pool ? "Özel Havuzlu" : "Havuz Yok"}</span>
          </span>
        </div>
      </section>

      {/* İçerik gövdesi */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 text-gray-700 sm:gap-5">
          {typeof villa.capacity === "number" && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="text-sm">{villa.capacity} Kişi</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-4 w-4" />
            <span className="text-sm">{villa.bedrooms} Yatak Odası</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Droplet className="h-4 w-4" />
            <span className="text-sm">{villa.has_pool ? "Özel Havuzlu" : "Havuz Yok"}</span>
          </span>
        </div>

        {/* Açıklama */}
        {villa.description && (
          <div className="mt-6 overflow-hidden rounded-lg border bg-white p-4">
            <p className="whitespace-pre-line break-words text-gray-700">{villa.description}</p>
          </div>
        )}

        {/* Özet özellikler (istersen bırakmaya devam edebiliriz) */}
        <div className="mt-6 grid grid-cols-1 items-center overflow-hidden rounded-lg border bg-white p-4">
          <FeaturesList
            bedrooms={villa.bedrooms}
            bathrooms={villa.bathrooms}
            pool={villa.has_pool}
            seaDistance={villa.sea_distance || "Belirtilmemiş"}
          />
        </div>

        {/* Detaylı boolean özellikler */}
        <VillaFeatures villa={villa} className="mt-6" />

        {/* Konum Haritası */}
        {villa.lat != null && villa.lng != null && (
          <MapModal
            villaName={villa.name}
            coordinates={{ lat: Number(villa.lat), lng: Number(villa.lng) }}
          />
        )}

        {/* Fırsat Aralıkları */}
        {opportunities && opportunities.length > 0 && (
          <OpportunityPeriods opportunities={opportunities} />
        )}

        {/* Takvim + fiyat + form */}
        <AvailabilityCalendar
          unavailable={unavailableRanges}
          villaName={villa.name}
          villaImage={coverUrl}
          villaId={villa.id}
          pricingPeriods={pricingPeriods || []}
          opportunities={opportunities}
          cleaningFee={villa.cleaning_fee || 0}
          discountPeriods={discountPeriods || []}
        />

        {/* Onaylı yorumlar */}
        {await (async () => {
          const ReviewsSection = (await import("@/components/site/ReviewsSection")).default;
          return <ReviewsSection villaId={villa.id} />;
        })()}
      </main>
    </>
  );
}
