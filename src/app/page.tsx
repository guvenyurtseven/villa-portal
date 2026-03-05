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
  await searchParams;
  return (
    <main className="mx-auto w-full">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6">
        <FlashThanks />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol Sütun */}
          <aside className="col-span-2">
            <div className="sticky top-20 z-10">
              <DiscountVillas />
            </div>
          </aside>

          {/* Orta Sütun - Ana İçerik */}
          <div className="col-span-8 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-semibold mb-2">Villa Dünyası</h1>
                  <p className="text-gray-600 italic mb-6">Tatiliniz İçin En Seçkin Villalar</p>
                </div>
                <section className="w-[480px] flex-shrink-0">
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
                <FeaturedVillas />
              </div>
            </div>
          </div>

          {/* Sağ Sütun - Fırsat Villalar */}
          <aside className="col-span-2">
            <div className="sticky top-20 z-10">
              <OpportunityVillas />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
