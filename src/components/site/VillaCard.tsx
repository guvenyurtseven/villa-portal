import Link from "next/link";
import CardGallery from "./CardGallery";
import { Users } from "lucide-react";

type VillaCardProps = {
  id: string;
  name: string;
  capacity?: number;
  images?: string[];
  province?: string | null;
  district?: string | null;
  neighborhood?: string | null;
};

export default function VillaCard({
  id,
  name,
  capacity,
  images,
  province,
  district,
  neighborhood,
}: VillaCardProps) {
  const location = [province, district, neighborhood].filter(Boolean).join(" / ");

  return (
    <Link
      href={`/villa/${id}`}
      className="group overflow-hidden rounded-xl border bg-white hover:shadow-md transition block"
    >
      <CardGallery images={images} alt={name} />
      <div className="p-4">
        <h3 className="font-semibold truncate">{name}</h3>

        {/* Konum: sadece değer varsa göster */}
        {location && <p className="text-sm text-gray-600 mt-1 truncate">{location}</p>}

        <div className="flex items-center justify-between mt-2">
          {typeof capacity === "number" && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{capacity}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
