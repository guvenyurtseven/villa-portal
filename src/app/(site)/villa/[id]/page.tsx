// src/app/(site)/villa/[id]/page.tsx
import { mockVillas } from "@/lib/mock-villas";
import PhotoGallery from "@/components/site/PhotoGallery";
import FeaturesList from "@/components/site/FeaturesList";
import AvailabilityCalendar from "@/components/site/AvailabilityCalendar";
import MapModal from "@/components/site/MapModal";

interface VillaPageProps {
  params: Promise<{ id: string }>; // Next 15 async params
}

export default async function VillaPage({ params }: VillaPageProps) {
  const { id } = await params;
  const villa = mockVillas.find((v) => v.id === id);

  if (!villa) {
    return (
      <main className="p-6 text-center">
        <h1 className="text-2xl font-bold">Villa bulunamadı</h1>
        <p className="text-gray-500 mt-2">Aradığınız villa listemizde mevcut değil.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{villa.name}</h1>
      <p className="text-gray-500 mt-1">
        {villa.location} · {villa.pricePerWeek} / hafta
      </p>

      {/* Foto galeri */}
      <div className="mt-6">
        <PhotoGallery photos={villa.photos} />
      </div>

      {/* Özellikler */}
      <FeaturesList
        bedrooms={villa.features.bedrooms}
        bathrooms={villa.features.bathrooms}
        pool={villa.features.pool}
        seaDistance={villa.features.seaDistance}
      />

      {/* Konum Haritası */}
      <MapModal villaName={villa.name} location={villa.location} coordinates={villa.coordinates} />

      {/* Takvim + fiyat + form */}
      <AvailabilityCalendar
        weeklyPrice={villa.weeklyPriceNum}
        unavailable={villa.unavailable}
        villaName={villa.name}
        villaImage={villa.image}
      />
    </main>
  );
}
