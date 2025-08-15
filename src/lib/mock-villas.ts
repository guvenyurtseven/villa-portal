// src/lib/mock-villas.ts
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
  coordinates: {
    lat: number;
    lng: number;
  };
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
  gizli: boolean; // Yeni eklenen özellik
};

export const mockVillas: Villa[] = [
  {
    id: "1",
    name: "Deniz Manzaralı Lüks Villa",
    location: "Bodrum, Muğla",
    coordinates: {
      lat: 37.0344,
      lng: 27.4305,
    },
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
    gizli: false,
  },
  {
    id: "2",
    name: "Doğa İçinde Sakin Villa",
    location: "Fethiye, Muğla",
    coordinates: {
      lat: 36.6219,
      lng: 29.1167,
    },
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
    gizli: false,
  },
  {
    id: "3",
    name: "Modern Tasarımlı Şehir Villası",
    location: "Kaş, Antalya",
    coordinates: {
      lat: 36.2011,
      lng: 29.6369,
    },
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
    gizli: true, // Bu villa gizli sayfada görünecek
  },
  {
    id: "4",
    name: "Sahil Kenarında Özel Villa",
    location: "Alaçatı, İzmir",
    coordinates: {
      lat: 38.2667,
      lng: 26.3667,
    },
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
    gizli: false,
  },
  {
    id: "5",
    name: "VIP Özel Villa",
    location: "Çeşme, İzmir",
    coordinates: {
      lat: 38.3225,
      lng: 26.3061,
    },
    pricePerWeek: "₺55.000",
    weeklyPriceNum: 55000,
    description: "Sadece özel müşteriler için. Ultra lüks ve özel hizmet.",
    image: "https://picsum.photos/seed/villa5/800/500",
    photos: [
      "https://picsum.photos/seed/villa5/800/500",
      "https://picsum.photos/seed/villa5b/800/500",
    ],
    features: {
      bedrooms: 6,
      bathrooms: 5,
      pool: true,
      seaDistance: "50 m",
    },
    unavailable: [],
    gizli: true,
  },
  {
    id: "6",
    name: "Premium Deniz Villa",
    location: "Datça, Muğla",
    coordinates: {
      lat: 36.7267,
      lng: 27.6869,
    },
    pricePerWeek: "₺45.000",
    weeklyPriceNum: 45000,
    description: "Özel koleksiyon villa. Sınırlı erişim.",
    image: "https://picsum.photos/seed/villa6/800/500",
    photos: ["https://picsum.photos/seed/villa6/800/500"],
    features: {
      bedrooms: 4,
      bathrooms: 4,
      pool: true,
      seaDistance: "20 m",
    },
    unavailable: [{ start: "2025-08-28", end: "2025-09-01", type: "reserved" }],
    gizli: true,
  },
];
