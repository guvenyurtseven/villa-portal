import Image from "next/image";
import FeaturesList from "@/components/site/FeaturesList";
import GalleryWithThumbnails from "@/components/site/GalleryWithThumbnails";
import BookingPanel from "@/components/site/BookingPanel";
import { mockVillas } from "@/lib/mock-villas";

export default async function VillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next 15 uyarısını çözmek için await
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
    <main className="p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Galeri + bilgi */}
        <div className="lg:col-span-2">
          <GalleryWithThumbnails photos={villa.photos} />

          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-3xl font-bold">{villa.name}</h1>
            <p className="text-gray-500 mt-1">{villa.location}</p>

            <div className="mt-4 text-xl font-semibold">{villa.pricePerWeek} / hafta</div>

            <FeaturesList
              bedrooms={villa.features.bedrooms}
              bathrooms={villa.features.bathrooms}
              hasPool={villa.features.hasPool}
              seaDistanceMeters={villa.features.seaDistanceMeters}
            />
          </div>
        </div>

        {/* Sağ: Rezervasyon paneli */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <BookingPanel
              villaId={villa.id}
              weeklyPrice={villa.weeklyPrice}
              reservedRanges={villa.reservedRanges}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
