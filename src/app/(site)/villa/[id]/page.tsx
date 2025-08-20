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

  if (error || !villa) {
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

  // ÖZEL FİYAT DÖNEMLERİNİ ÇEK - YENİ
  const { data: pricingPeriods } = await supabase
    .from("villa_pricing_periods")
    .select("*")
    .eq("villa_id", id)
    .order("start_date", { ascending: true });

  // Müsait olmayan tarihleri formatla
  const unavailableRanges: any[] = [];

  // Onaylı rezervasyonları ekle
  if (reservations) {
    reservations.forEach((res: any) => {
      // [YYYY-MM-DD,YYYY-MM-DD) veya [YYYY-MM-DD,YYYY-MM-DD] ikisini de destekler
      const RANGE_RE = /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})[\)\]]$/;
      const match = (res.date_range as string).match(RANGE_RE);

      if (match) {
        unavailableRanges.push({
          start: match[1],
          end: match[2],
          type: "reserved" as const,
        });
      }
    });
  }

  // Bloke tarihleri ekle
  if (blockedDates) {
    blockedDates.forEach((block: any) => {
      // [YYYY-MM-DD,YYYY-MM-DD) veya [YYYY-MM-DD,YYYY-MM-DD] ikisini de destekler
      const RANGE_RE = /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})[\)\]]$/;
      const match = (res.date_range as string).match(RANGE_RE);

      if (match) {
        const type = block.reason === "Rezervasyon" ? "reserved" : "blocked";
        unavailableRanges.push({
          start: match[1],
          end: match[2],
          type: type as "reserved" | "blocked",
        });
      }
    });
  }

  // Debug için log ekleyelim
  console.log("Pricing periods:", pricingPeriods);
  console.log("Unavailable ranges:", unavailableRanges);

  // Fotoğrafları sırala
  const sortedPhotos =
    villa.photos?.sort((a: any, b: any) => a.order_index - b.order_index)?.map((p: any) => p.url) ||
    [];

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
      {villa.lat && villa.lng && (
        <MapModal
          villaName={villa.name}
          location={villa.location}
          coordinates={{
            lat: parseFloat(villa.lat),
            lng: parseFloat(villa.lng),
          }}
        />
      )}

      {/* Takvim + fiyat + form - PRICING PERIODS EKLENDİ */}
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
