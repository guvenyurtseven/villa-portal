// src/lib/mock-villas.ts
export type UnavailableRange = {
  start: string; // ISO string (YYYY-MM-DD)
  end: string; // ISO string (YYYY-MM-DD)
  type: "reserved" | "blocked";
};

export type Villa = {
  id: string;
  name: string;
  location: string;
  pricePerWeek: string; // Görsel gösterim için
  weeklyPriceNum: number; // Hesaplama için (TRY)
  description: string;
  image: string; // birincil foto
  photos: string[]; // galeri
  features: {
    bedrooms: number;
    bathrooms: number;
    pool: boolean;
    seaDistance: string;
  };
  unavailable: UnavailableRange[]; // dolu/bloke tarih aralıkları
};

export const mockVillas: Villa[] = [
  {
    id: "1",
    name: "Deniz Manzaralı Lüks Villa",
    location: "Bodrum, Muğla",
    pricePerWeek: "₺35.000",
    weeklyPriceNum: 35000,
    description:
      "Ege'nin muhteşem manzarasına sahip bu villa, özel havuz ve geniş bahçe imkanı sunar. Modern tasarımıyla tatilinizi unutulmaz kılar.",
    image: "https://picsum.photos/seed/villa1/800/500",
    photos: [
      "https://picsum.photos/seed/villa1/800/500",
      "https://picsum.photos/seed/villa1b/800/500",
      "https://picsum.photos/seed/villa1c/800/500",
      "https://picsum.photos/seed/villa1d/800/500",
    ],
    features: {
      bedrooms: 4,
      bathrooms: 3,
      pool: true,
      seaDistance: "150 m",
    },
    unavailable: [
      { start: "2025-08-12", end: "2025-08-18", type: "reserved" },
      { start: "2025-08-22", end: "2025-08-25", type: "blocked" },
      { start: "2025-09-08", end: "2025-09-14", type: "reserved" },
    ],
  },
  {
    id: "2",
    name: "Doğa İçinde Sakin Villa",
    location: "Fethiye, Muğla",
    pricePerWeek: "₺28.000",
    weeklyPriceNum: 28000,
    description:
      "Yeşillikler içinde huzurlu bir tatil için ideal. Ahşap detaylı mimarisiyle doğa severler için tasarlandı.",
    image: "https://picsum.photos/seed/villa2/800/500",
    photos: [
      "https://picsum.photos/seed/villa2/800/500",
      "https://picsum.photos/seed/villa2b/800/500",
      "https://picsum.photos/seed/villa2c/800/500",
    ],
    features: {
      bedrooms: 3,
      bathrooms: 2,
      pool: true,
      seaDistance: "2 km",
    },
    unavailable: [
      { start: "2025-08-15", end: "2025-08-22", type: "reserved" },
      { start: "2025-09-01", end: "2025-09-03", type: "blocked" },
    ],
  },
  {
    id: "3",
    name: "Modern Tasarımlı Şehir Villası",
    location: "Kaş, Antalya",
    pricePerWeek: "₺32.000",
    weeklyPriceNum: 32000,
    description: "Merkeze yakın, modern ve ferah. Özel havuz ve geniş teras.",
    image: "https://picsum.photos/seed/villa3/800/500",
    photos: [
      "https://picsum.photos/seed/villa3/800/500",
      "https://picsum.photos/seed/villa3b/800/500",
    ],
    features: {
      bedrooms: 3,
      bathrooms: 3,
      pool: true,
      seaDistance: "500 m",
    },
    unavailable: [{ start: "2025-09-10", end: "2025-09-12", type: "reserved" }],
  },
  {
    id: "4",
    name: "Sahil Kenarında Özel Villa",
    location: "Alaçatı, İzmir",
    pricePerWeek: "₺40.000",
    weeklyPriceNum: 40000,
    description: "Denize sıfır, özel plaj erişimi. Şık ve konforlu.",
    image: "https://picsum.photos/seed/villa4/800/500",
    photos: [
      "https://picsum.photos/seed/villa4/800/500",
      "https://picsum.photos/seed/villa4b/800/500",
    ],
    features: {
      bedrooms: 5,
      bathrooms: 4,
      pool: true,
      seaDistance: "0 m",
    },
    unavailable: [{ start: "2025-08-05", end: "2025-08-09", type: "blocked" }],
  },
];
