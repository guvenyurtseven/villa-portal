// src/components/site/FeaturesList.tsx
import { Bed, Bath, Waves, Droplet } from "lucide-react";

export default function FeaturesList({
  bedrooms,
  bathrooms,
  pool,
  seaDistance,
}: {
  bedrooms: number;
  bathrooms: number;
  pool: boolean;
  seaDistance: string;
}) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 text-sm justify-items-center">
      <li className="flex items-center gap-2">
        <Bed className="h-4 w-4" /> {bedrooms} Yatak Odası
      </li>
      <li className="flex items-center gap-2">
        <Bath className="h-4 w-4" /> {bathrooms} Banyo
      </li>
      <li className="flex items-center gap-2">
        <Droplet className="h-4 w-4" /> {pool ? "Özel Havuz" : "Havuz Yok"}
      </li>
      <li className="flex items-center gap-2">
        <Waves className="h-4 w-4" /> Denize uzaklık: {seaDistance}
      </li>
    </ul>
  );
}
