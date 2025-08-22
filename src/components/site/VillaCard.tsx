import Link from "next/link";
import CardGallery from "./CardGallery";

export default function VillaCard({
  id,
  name,
  location,
  weeklyPrice,
  images,
}: {
  id: string;
  name: string;
  location?: string | null;
  weeklyPrice?: number | null;
  images?: string[];
}) {
  return (
    <Link
      href={`/villa/${id}`}
      className="group overflow-hidden rounded-xl border bg-white hover:shadow-md transition block"
    >
      <CardGallery images={images} alt={name} />
      <div className="p-4">
        <h3 className="font-semibold truncate">{name}</h3>
        {location ? <p className="text-sm text-muted-foreground truncate">{location}</p> : null}
        {typeof weeklyPrice === "number" ? (
          <p className="mt-2 text-sm">
            Haftalık&nbsp;
            <span className="font-semibold">
              ₺{Number(weeklyPrice || 0).toLocaleString("tr-TR")}
            </span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
