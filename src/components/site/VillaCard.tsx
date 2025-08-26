import Link from "next/link";
import CardGallery from "./CardGallery";

export default function VillaCard({
  id,
  name,
  images,
}: {
  id: string;
  name: string;
  weeklyPrice?: number | null; // Artık kullanılmayacak ama prop olarak gelmeye devam edebilir
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

        {/* FİYAT GÖSTERIMINI KALDIRDIK */}
        {/* Alternatif olarak şunu ekleyebilirsiniz: */}
        <p className="mt-2 text-sm text-gray-600">Fiyat için tarih seçiniz</p>
      </div>
    </Link>
  );
}
