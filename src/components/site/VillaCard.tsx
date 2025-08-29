import Link from "next/link";
import CardGallery from "./CardGallery";
import { Users, BedDouble, Bath } from "lucide-react";

export default function VillaCard({
  id,
  name,
  capacity,
  images,
  province,
  district,
  neighborhood,
  bedrooms,
  bathrooms,
}: {
  id: string;
  name: string;
  capacity?: number;
  images?: string[];
  province?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}) {
  return (
    <Link
      href={`/villa/${id}`}
      className="group overflow-hidden rounded-xl border bg-white hover:shadow-md transition block"
    >
      <CardGallery images={images} alt={name} />
      <div className="p-4">
        <h3 className="font-semibold truncate">{name}</h3>

        <p className="text-sm text-gray-600 mt-1">
          {[province, district, neighborhood].filter(Boolean).join(" / ")}
        </p>

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          {capacity != null && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {capacity}
            </span>
          )}
          {bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              {bedrooms}
            </span>
          )}
          {bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {bathrooms}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
