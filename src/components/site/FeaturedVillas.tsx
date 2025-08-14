"use client";

import VillaCard from "./VillaCard";
import { mockVillas } from "@/lib/mock-villas";

interface FeaturedVillasProps {
  showHidden?: boolean; // Gizli villaları gösterip göstermeyeceğini belirler
}

export default function FeaturedVillas({ showHidden = false }: FeaturedVillasProps) {
  // Gizli durumuna göre villaları filtrele
  const filteredVillas = mockVillas.filter((villa) => (showHidden ? villa.gizli : !villa.gizli));

  return (
    <section className="my-8">
      <h2 className="text-2xl font-bold mb-4">
        {showHidden ? "Özel Villalar" : "Öne Çıkan Villalar"}
      </h2>

      {filteredVillas.length > 0 ? (
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {filteredVillas.map((villa) => (
              <VillaCard
                key={villa.id}
                id={villa.id}
                name={villa.name}
                location={villa.location}
                pricePerWeek={villa.pricePerWeek}
                image={villa.image}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">
          {showHidden ? "Henüz özel villa bulunmamaktadır." : "Henüz villa bulunmamaktadır."}
        </div>
      )}
    </section>
  );
}
