// src/lib/mock-villas.ts
export type ReservedRange = { start: string; end: string };

export type Villa = {
  id: string;
  name: string;
  location: string;
  pricePerWeek: string; // kartlarda kullandığın metin
  weeklyPrice: number; // hesap için sayı
  image: string; // kapak
  photos: string[]; // galeri
  features: {
    bedrooms: number;
    bathrooms: number;
    hasPool: boolean;
    seaDistanceMeters: number;
  };
  reservedRanges: ReservedRange[];
};

export const mockVillas: Villa[] = [
  {
    id: "1",
    name: "Deniz Manzaralı Lüks Villa",
    location: "Bodrum, Muğla",
    pricePerWeek: "₺35.000",
    weeklyPrice: 35000,
    image: "https://picsum.photos/seed/villa1/800/500",
    photos: [
      "https://picsum.photos/seed/villa1/1200/800",
      "https://picsum.photos/seed/villa1b/1200/800",
      "https://picsum.photos/seed/villa1c/1200/800",
      "https://picsum.photos/seed/villa1d/1200/800",
    ],
    features: { bedrooms: 4, bathrooms: 3, hasPool: true, seaDistanceMeters: 250 },
    reservedRanges: [
      { start: "2025-08-14", end: "2025-08-17" },
      { start: "2025-08-22", end: "2025-08-28" },
      { start: "2025-09-10", end: "2025-09-12" },
    ],
  },
  {
    id: "2",
    name: "Doğa İçinde Sakin Villa",
    location: "Fethiye, Muğla",
    pricePerWeek: "₺28.000",
    weeklyPrice: 28000,
    image: "https://picsum.photos/seed/villa2/800/500",
    photos: [
      "https://picsum.photos/seed/villa2/1200/800",
      "https://picsum.photos/seed/villa2b/1200/800",
      "https://picsum.photos/seed/villa2c/1200/800",
    ],
    features: { bedrooms: 3, bathrooms: 2, hasPool: true, seaDistanceMeters: 1200 },
    reservedRanges: [{ start: "2025-08-19", end: "2025-08-23" }],
  },
];
