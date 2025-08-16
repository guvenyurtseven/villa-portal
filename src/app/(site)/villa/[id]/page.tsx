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

  // Rezervasyonları ve bloke tarihleri çek
  const { data: reservations } = await supabase
    .from("reservations")
    .select("date_range, status")
    .eq("villa_id", id)
    .neq("status", "cancelled");

  const { data: blockedDates } = await supabase
    .from("blocked_dates")
    .select("date_range")
    .eq("villa_id", id);

  // Müsait olmayan tarihleri formatla
  const unavailableRanges = [
    ...(reservations || []).map((r) => ({
      start: parseDateRange(r.date_range).start,
      end: parseDateRange(r.date_range).end,
      type: "reserved" as const,
    })),
    ...(blockedDates || []).map((b) => ({
      start: parseDateRange(b.date_range).start,
      end: parseDateRange(b.date_range).end,
      type: "blocked" as const,
    })),
  ];

  // Fotoğrafları sırala
  const sortedPhotos =
    villa.photos?.sort((a: any, b: any) => a.order_index - b.order_index)?.map((p: any) => p.url) ||
    [];

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{villa.name}</h1>
      <p className="text-gray-500 mt-1">
        {villa.location} · ₺{villa.weekly_price.toLocaleString("tr-TR")} / hafta
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
          coordinates={{ lat: villa.lat, lng: villa.lng }}
        />
      )}

      {/* Takvim + fiyat + form */}
      <AvailabilityCalendar
        weeklyPrice={villa.weekly_price}
        unavailable={unavailableRanges}
        villaName={villa.name}
        villaImage={sortedPhotos[0] || "/placeholder.jpg"}
      />
    </main>
  );
}

// Helper function
function parseDateRange(dateRange: string): { start: string; end: string } {
  const match = dateRange.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
  if (match) {
    return {
      start: match[1],
      end: match[2],
    };
  }
  return { start: "", end: "" };
}
