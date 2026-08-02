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
          <aside className="order-2 lg:order-none lg:col-span-2">
            <div className="sticky top-20 z-10">
              <DiscountVillas />
            </div>
          </aside>

          {/* Orta Sütun - Ana İçerik */}
          <div className="order-1 space-y-6 lg:order-none lg:col-span-8">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-4xl font-semibold mb-2">Villa Dünyası</h1>
                  <p className="text-gray-600 italic mb-6">Tatiliniz İçin En Seçkin Villalar</p>
                </div>
                <section className="w-full sm:max-w-[480px] sm:flex-shrink-0">
                  <SearchBar />
                </section>
              </div>
              {/* Kategoriler */}
              <div className="mt-5 sm:mt-0">
                <CategoryNav />
              </div>

              <div className="mx-auto mt-4 max-w-6xl">
                <QuickSearch />
              </div>

              {/* Öne Çıkan Villalar */}
              <div className="mt-6">
                <FeaturedVillas />
              </div>
            </div>
          </div>

          {/* Sağ Sütun - Fırsat Villalar */}
          <aside className="order-3 lg:order-none lg:col-span-2">
            <div className="sticky top-20 z-10">
              <OpportunityVillas />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
