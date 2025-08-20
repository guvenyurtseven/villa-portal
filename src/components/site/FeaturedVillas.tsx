"use client";

import { useEffect, useState } from "react";
import VillaCard from "./VillaCard";

interface Villa {
  id: string;
  name: string;
  location: string;
  weekly_price: number;
  description: string | null;
  bedrooms: number;
  bathrooms: number;
  has_pool: boolean;
  sea_distance: string | null;
  is_hidden: boolean;
  primaryPhoto: string;
  photos: any[];
}

interface FeaturedVillasProps {
  showHidden?: boolean;
}

export default function FeaturedVillas({ showHidden = false }: FeaturedVillasProps) {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVillas() {
      try {
        // showHidden parametresini API'ye gönder
        const response = await fetch(`/api/villas?showHidden=${showHidden}`);
        if (!response.ok) throw new Error("Villalar yüklenemedi");

        const data = await response.json();

        // Gelen villaları filtrele
        const filteredVillas = data.filter((villa: Villa) => {
          if (showHidden) {
            return villa.is_hidden === true; // Sadece gizli olanları göster
          } else {
            return villa.is_hidden === false; // Sadece gizli olmayanları göster
          }
        });

        setVillas(filteredVillas);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }

    fetchVillas();
  }, [showHidden]);

  if (loading) {
    return (
      <section className="my-8">
        <h2 className="text-2xl font-bold mb-4">
          {showHidden ? "Özel Villalar" : "Öne Çıkan Villalar"}
        </h2>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-72 h-64 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="my-8">
        <h2 className="text-2xl font-bold mb-4">
          {showHidden ? "Özel Villalar" : "Öne Çıkan Villalar"}
        </h2>
        <div className="text-red-500">Hata: {error}</div>
      </section>
    );
  }

  return (
    <section className="my-8">
      <h2 className="text-2xl font-bold mb-4">
        {showHidden ? "Özel Koleksiyon Villalar" : "Öne Çıkan Villalar"}
      </h2>

      {villas.length > 0 ? (
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {villas.map((villa) => (
              <VillaCard
                key={villa.id}
                id={villa.id}
                name={villa.name}
                location={villa.location}
                pricePerWeek={`₺${villa.weekly_price.toLocaleString("tr-TR")}`}
                image={villa.primaryPhoto || "/placeholder.jpg"}
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
