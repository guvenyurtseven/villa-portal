import Link from "next/link";

export default function HakkimizdaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Hakkımızda</h1>
      <p className="text-gray-700 leading-7">
        Villa Dünyası, tatil villalarını güvenli ve hızlı şekilde keşfetmeniz için geliştirilen bir
        rezervasyon platformudur. Uygun dönemler, indirimli fırsatlar ve detaylı villa bilgileri
        tek bir akışta sunulur.
      </p>
      <p className="text-gray-700 leading-7">
        Rezervasyon ve bilgi talepleriniz için admin ekibi en kısa sürede geri dönüş sağlar.
      </p>
      <div className="rounded-lg border bg-white p-4">
        <h2 className="font-medium mb-2">İletişim</h2>
        <p className="text-sm text-gray-700">E-posta: info@villadunyasi.com</p>
        <p className="text-sm text-gray-700">Telefon: +90 531 579 40 88</p>
      </div>
      <Link href="/villas" className="inline-block text-orange-600 hover:underline">
        Villalara göz at
      </Link>
    </main>
  );
}
