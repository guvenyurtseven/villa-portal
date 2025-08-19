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

  // Rezervasyonları çek
  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("*")
    .eq("villa_id", id);

  console.log("Reservations:", reservations, "Error:", resError);

  // Bloke tarihleri çek
  const { data: blockedDates, error: blockError } = await supabase
    .from("blocked_dates")
    .select("*")
    .eq("villa_id", id);

  console.log("Blocked dates:", blockedDates, "Error:", blockError);

  // Müsait olmayan tarihleri formatla
  const unavailableRanges: any[] = [];

  // Onaylı rezervasyonları ekle
  if (reservations && reservations.length > 0) {
    reservations.forEach((res: any) => {
      // Sadece onaylı veya bekleyen rezervasyonları dahil et
      if (res.status === "confirmed" || res.status === "pending") {
        const match = res.date_range.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
        if (match) {
          unavailableRanges.push({
            start: match[1],
            end: match[2],
            type: "reserved" as const,
          });
          console.log("Added reservation:", match[1], "to", match[2]);
        }
      }
    });
  }

  // Bloke tarihleri ekle
  if (blockedDates && blockedDates.length > 0) {
    blockedDates.forEach((block: any) => {
      const match = block.date_range.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
      if (match) {
        unavailableRanges.push({
          start: match[1],
          end: match[2],
          type: "reserved" as const, // Tümünü reserved olarak işaretle
        });
        console.log("Added blocked date:", match[1], "to", match[2], "Reason:", block.reason);
      }
    });
  }

  console.log("Final unavailable ranges:", unavailableRanges);

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
