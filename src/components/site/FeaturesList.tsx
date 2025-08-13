// src/components/site/FeaturesList.tsx
"use client";

import { Bed, Bath, Waves, Ruler } from "lucide-react";

export default function FeaturesList({
  bedrooms,
  bathrooms,
  hasPool,
  seaDistanceMeters,
}: {
  bedrooms: number;
  bathrooms: number;
  hasPool: boolean;
  seaDistanceMeters: number;
}) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <li className="flex items-center gap-2">
        <Bed className="h-4 w-4" /> {bedrooms} yatak odası
      </li>
      <li className="flex items-center gap-2">
        <Bath className="h-4 w-4" /> {bathrooms} banyo
      </li>
      <li className="flex items-center gap-2">
        <Waves className="h-4 w-4" /> {hasPool ? "Özel havuz" : "Havuz yok"}
      </li>
      <li className="flex items-center gap-2">
        <Ruler className="h-4 w-4" /> Denize {seaDistanceMeters} m
      </li>
    </ul>
  );
}
