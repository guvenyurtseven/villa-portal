import { createClient } from "@/lib/supabase/server";
import PhotoGallery from "@/components/site/PhotoGallery";
import FeaturesList from "@/components/site/FeaturesList";
import AvailabilityCalendar from "@/components/site/AvailabilityCalendar";
import MapModal from "@/components/site/MapModal";
import { notFound } from "next/navigation";
import VillaFeatures from "@/components/site/VillaFeatures";
import OpportunityPeriods from "@/components/site/OpportunityPeriods";

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

  // --- FIRSAT ARALIKLARI HESAPLAMA ---
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 30);

  const unavailableDays = new Set<string>();

  // Tüm dolu günleri topla
  unavailableRanges.forEach((range) => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const current = new Date(start);
    while (current < end) {
      unavailableDays.add(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
  });

  // Dolu günleri sırala
  const sortedUnavailable = Array.from(unavailableDays).sort();
  const opportunities: any[] = [];

  // Ardışık dolu günler arasındaki boşlukları bul
  for (let i = 0; i < sortedUnavailable.length - 1; i++) {
    const currentEnd = new Date(sortedUnavailable[i]);
    const nextStart = new Date(sortedUnavailable[i + 1]);

    // İki dolu dönem arasındaki boşluk başlangıcı
    const gapStart = new Date(currentEnd);
    gapStart.setDate(gapStart.getDate() + 1);

    // Boşluk günlerini hesapla
    const diffTime = Math.abs(nextStart.getTime() - gapStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 2-7 gün arasındaki boşlukları fırsat olarak değerlendir
    if (diffDays >= 2 && diffDays <= 7) {
      let hasPrice = true;
      let totalPrice = 0;
      const checkDate = new Date(gapStart);

      // Her gün için fiyat kontrolü
      for (let j = 0; j < diffDays; j++) {
        const dateStr = checkDate.toISOString().slice(0, 10);

        // Bu gün için tanımlı fiyat var mı?
        const period = pricingPeriods?.find((p: any) => {
          const start = new Date(p.start_date);
          const end = new Date(p.end_date);
          return checkDate >= start && checkDate <= end;
        });

        if (!period) {
          hasPrice = false;
          break;
        }

        totalPrice += Number(period.nightly_price);
        checkDate.setDate(checkDate.getDate() + 1);
      }

      // Tüm günlerde fiyat tanımlıysa fırsata ekle
      if (hasPrice && totalPrice > 0) {
        const opportunityEnd = new Date(gapStart);
        opportunityEnd.setDate(opportunityEnd.getDate() + diffDays - 1);

        opportunities.push({
          startDate: gapStart.toISOString().slice(0, 10),
          endDate: opportunityEnd.toISOString().slice(0, 10),
          nights: diffDays,
          originalPrice: totalPrice,
          discountedPrice: Math.round(totalPrice * 0.8), // %20 indirim
          discountPercentage: 20,
        });
      }
    }
  }

  // Bugün müsaitse ve yakın rezervasyon varsa kontrol et
  const todayStr = today.toISOString().slice(0, 10);
  if (!unavailableDays.has(todayStr) && sortedUnavailable.length > 0) {
    const firstBookedDate = new Date(sortedUnavailable[0]);
    const diffTime = Math.abs(firstBookedDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 2 && diffDays <= 7) {
      let hasPrice = true;
      let totalPrice = 0;
      const checkDate = new Date(today);

      for (let j = 0; j < diffDays; j++) {
        const period = pricingPeriods?.find((p: any) => {
          const start = new Date(p.start_date);
          const end = new Date(p.end_date);
          return checkDate >= start && checkDate <= end;
        });

        if (!period) {
          hasPrice = false;
          break;
        }

        totalPrice += Number(period.nightly_price);
        checkDate.setDate(checkDate.getDate() + 1);
      }

      if (hasPrice && totalPrice > 0) {
        const opportunityEnd = new Date(today);
        opportunityEnd.setDate(opportunityEnd.getDate() + diffDays - 1);

        opportunities.unshift({
          startDate: todayStr,
          endDate: opportunityEnd.toISOString().slice(0, 10),
          nights: diffDays,
          originalPrice: totalPrice,
          discountedPrice: Math.round(totalPrice * 0.8),
          discountPercentage: 20,
        });
      }
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{villa.name}</h1>
      {/* Fiyat gösterimi kaldırıldı */}
      <p className="text-gray-500 mt-1">Fiyat için tarih seçiniz</p>

      {/* Foto galeri */}
      <div className="mt-6">
        <PhotoGallery photos={safePhotos} />
      </div>

      {/* Açıklama */}
      {villa.description && <p className="mt-4 text-gray-700">{villa.description}</p>}

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
      />
    </main>
  );
}
