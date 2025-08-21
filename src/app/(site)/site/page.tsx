// src/app/(site)/site/page.tsx
import FeaturedVillas from "@/components/site/FeaturedVillas";

export default async function SiteHomePage() {
  return (
    <main className="container py-8 space-y-10">
      {/* Header’ın hemen altı için basit bir hero alanı */}
      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Villa Portal</h1>
        <p className="text-muted-foreground">Öncelik puanına göre öne çıkan villaları keşfedin.</p>
      </section>

      {/* Öne Çıkan Villalar + Alt kısımda tüm villalar */}
      <FeaturedVillas />
    </main>
  );
}
