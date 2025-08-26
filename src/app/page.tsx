import FeaturedVillas from "@/components/site/FeaturedVillas";
import CategoryNav from "@/components/site/CategoryNav";
import OpportunityVillas from "@/components/site/OpportunityVillas";
import { Filter } from "lucide-react";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Sütun - Filtreler (İleride eklenecek) */}
        <aside className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Filtreler</h3>
              </div>
              <p className="text-xs text-gray-500">Yakında eklenecek...</p>
            </div>
          </div>
        </aside>

        {/* Orta Sütun - Ana İçerik */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Villa Kiralama</h1>
            <p className="text-gray-600 mb-6">Tatiliniz için mükemmel villalar</p>

            {/* Kategoriler */}
            <CategoryNav />

            {/* Öne Çıkan Villalar */}
            <div className="mt-6">
              <FeaturedVillas showHidden={false} />
            </div>
          </div>
        </div>

        {/* Sağ Sütun - Fırsat Villalar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-20">
            <OpportunityVillas />
          </div>
        </aside>
      </div>
    </main>
  );
}
