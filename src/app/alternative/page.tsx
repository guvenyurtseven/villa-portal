import FeaturedVillas from "@/components/site/FeaturedVillas";

export default function AlternativePage() {
  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-2">Özel Koleksiyon</h1>
      <p className="text-gray-600 mb-8">Size özel hazırlanmış villa seçenekleri</p>

      {/* Gizli villaları göster */}
      <FeaturedVillas showHidden={true} />
    </main>
  );
}
