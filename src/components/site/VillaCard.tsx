import Link from "next/link";
import CardGallery from "./CardGallery";
import { Users, BedDouble, Bath } from "lucide-react";
import { MapPin, X } from "lucide-react";
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
  reference_code,
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
  reference_code?: string | null; // EKLENDİ: referans kodu
}) {
  return (
    <Link
      href={`/villa/${id}`}
      className="group block overflow-hidden rounded-xl border bg-white transition hover:shadow-md"
    >
      <CardGallery images={images} alt={name} />

      <div className="text-center bg-orange-500 text-white py-1">
        <h3 className="truncate font-semibold font-mono">{name}</h3>
      </div>
      <div className="p-4">
        {/* İSİM ALTINDA REFERANS KODU ROZETİ */}
        {reference_code && (
          <span className="text-center mt-1 inline-block rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            #{reference_code}
          </span>
        )}

        {(province || district || neighborhood) && (
          <p className="mt-1 text-sm text-gray-600 truncate flex items-center py-2">
            <MapPin className="h-5 w-4" />

            {[province, district, neighborhood].filter(Boolean).join(" / ")}
          </p>
        )}
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
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
