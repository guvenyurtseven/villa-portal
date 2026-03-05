import Link from "next/link";
import { CATEGORY_DEFS } from "@/lib/categories";

export default function KategorilerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Kategoriler</h1>
      <p className="text-gray-600">İlginizi çeken kategoriye geçerek uygun villaları inceleyin.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORY_DEFS.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className="rounded-xl border bg-white p-4 hover:shadow transition"
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <h2 className="font-medium">{c.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{c.slug}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
