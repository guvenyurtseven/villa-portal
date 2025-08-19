import Navbar from "@/components/site/Navbar";
import FeaturedVillas from "@/components/site/FeaturedVillas";

export default function SiteHome() {
  return (
    <div>
      {/* Üst menü */}
      <Navbar />

      {/* İçerik alanı */}
      <main className="max-w-6xl mx-auto px-4">
        <FeaturedVillas showHidden={false} />
      </main>
    </div>
  );
}
