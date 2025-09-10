import FeaturedVillas from "@/components/site/FeaturedVillas";
import CategoryNav from "@/components/site/CategoryNav";
import OpportunityVillas from "@/components/site/OpportunityVillas";
import DiscountVillas from "@/components/site/DiscountVillas";
import QuickSearch from "@/components/site/QuickSearch";
import SearchBar from "@/components/site/SearchBar";
import FlashThanks from "@/components/site/FlashThanks";
export default async function Home({
  searchParams,
}: {
  // Next 15: Promise!
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const showThanks = sp?.pre === "1";
  return (
    <main className="max-w-9/10 mx-auto py-6">
      <FlashThanks />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 w-full">
        {/* Sol Sütun */}
        <aside className="lg:col-span-2">
          <div className="sticky top-20">
            {/* İndirimli Dönemler */}
            <DiscountVillas />
          </div>
        </aside>

        {/* Orta Sütun - Ana İçerik */}
        <div className="lg:col-span-8 space-y-8">
          <div>
            <div className="grid grid-cols-2 py-8 px-4">
              <div className="px-8">
                <h1 className="text-4xl font-semibold mb-2">Villa Dünyası</h1>
                <p className="text-gray-600 italic mb-6">Tatiliniz İçin En Seçkin Villalar</p>
              </div>
              <section>
                <SearchBar />
              </section>
            </div>
            {/* Kategoriler */}
            <CategoryNav />

            <div className="max-w-6xl mx-auto px-4 mt-4">
              <QuickSearch />
            </div>

            {/* Öne Çıkan Villalar */}
            <div className="mt-6">
              <FeaturedVillas showHidden={false} />
            </div>
          </div>
        </div>

        {/* Sağ Sütun - Fırsat Villalar */}
        <aside className="lg:col-span-2">
          <div className="sticky top-20">
            <OpportunityVillas />
          </div>
        </aside>
      </div>
    </main>
  );
}
