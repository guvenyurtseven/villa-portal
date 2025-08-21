import { createClient } from "@/lib/supabase/server";
import PhotoGallery from "@/components/site/PhotoGallery";
import FeaturesList from "@/components/site/FeaturesList";
import AvailabilityCalendar from "@/components/site/AvailabilityCalendar";
import MapModal from "@/components/site/MapModal";
import { notFound } from "next/navigation";

interface VillaPageProps {
  params: Promise<{ id: string }>;
}

export default async function VillaPage({ params }: VillaPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Villa bilgilerini çek
  const { data: villa, error } = await supabase
    .from("villas")
    .select(
      `
      *,
      photos:villa_photos(*)
    `,
    )
    .eq("id", id)
    .single();

  // Villa bulunamadıysa veya gizliyse 404
  if (error || !villa || villa.is_hidden) {
    notFound();
  }

  // Rezervasyonları çek (onaylı olanlar)
  const { data: reservations } = await supabase
    .from("reservations")
    .select("date_range, status")
    .eq("villa_id", id)
    .eq("status", "confirmed");

  // Bloke tarihleri çek
  const { data: blockedDates } = await supabase
    .from("blocked_dates")
    .select("date_range, reason")
    .eq("villa_id", id);

  // Özel fiyat dönemlerini çek
  const { data: pricingPeriods } = await supabase
    .from("villa_pricing_periods")
    .select("*")
    .eq("villa_id", id)
    .order("start_date", { ascending: true });

  // Müsait olmayan tarihleri formatla
  const unavailableRanges: Array<{
    start: string;
    end: string;
    type: "reserved" | "blocked";
  }> = [];

  const RANGE_RE = /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})[\)\]]$/;

  // Onaylı rezervasyonları ekle
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

  // Bloke tarihleri ekle (BUGFIX: 'res' yerine 'block' kullanıldı)
  if (blockedDates) {
    blockedDates.forEach((block: any) => {
      const match = String(block.date_range ?? "").match(RANGE_RE);
      if (match) {
        const type: "reserved" | "blocked" =
          block.reason === "Rezervasyon" ? "reserved" : "blocked";
        unavailableRanges.push({
          start: match[1],
          end: match[2],
          type,
        });
      }
    });
  }

  // Debug (isteğe bağlı)
  // console.log("Pricing periods:", pricingPeriods);
  // console.log("Unavailable ranges:", unavailableRanges);

  // Fotoğrafları sırala
  const sortedPhotos =
    villa.photos
      ?.slice()
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      ?.map((p: any) => p.url) || [];

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{villa.name}</h1>
      <p className="text-gray-500 mt-1">
        {villa.location} · ₺{villa.weekly_price?.toLocaleString("tr-TR")} / hafta
      </p>

      {/* Açıklama */}
      {villa.description && <p className="mt-4 text-gray-700">{villa.description}</p>}

      {/* Foto galeri */}
      <div className="mt-6">
        <PhotoGallery photos={sortedPhotos} />
      </div>

      {/* Özellikler */}
      <FeaturesList
        bedrooms={villa.bedrooms}
        bathrooms={villa.bathrooms}
        pool={villa.has_pool}
        seaDistance={villa.sea_distance || "Belirtilmemiş"}
      />

      {/* Konum Haritası */}
      {villa.lat != null && villa.lng != null && (
        <MapModal
          villaName={villa.name}
          location={villa.location}
          coordinates={{
            lat: Number(villa.lat),
            lng: Number(villa.lng),
          }}
        />
      )}

      {/* Takvim + fiyat + form */}
      <AvailabilityCalendar
        weeklyPrice={villa.weekly_price}
        unavailable={unavailableRanges}
        villaName={villa.name}
        villaImage={sortedPhotos[0] || "/placeholder.jpg"}
        villaId={villa.id}
        pricingPeriods={pricingPeriods || []}
      />
    </main>
  );
}
