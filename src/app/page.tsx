import FeaturedVillas from "@/components/site/FeaturedVillas";
import CategoryNav from "@/components/site/CategoryNav";
export default function Home() {
  return (
    <main className="max-w-7xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-2">Villa Kiralama</h1>
      <p className="text-gray-600 mb-8">Tatiliniz için mükemmel villalar</p>
      {/* Kategoriler */}
      <CategoryNav />
      {/* Sadece gizli olmayan villaları göster */}
      <FeaturedVillas showHidden={false} />
    </main>
  );
}
