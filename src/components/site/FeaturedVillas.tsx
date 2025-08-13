"use client";

import VillaCard from "./VillaCard";
import { mockVillas } from "@/lib/mock-villas"; // Tek veri kaynağı

export default function FeaturedVillas() {
  return (
    <section className="my-8">
      <h2 className="text-2xl font-bold mb-4">Öne Çıkan Villalar</h2>

      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {mockVillas.map((villa) => (
            <VillaCard
              key={villa.id}
              id={villa.id} // id parametresini ekledik
              name={villa.name}
              location={villa.location}
              pricePerWeek={villa.pricePerWeek}
              image={villa.image}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
