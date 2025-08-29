export type Locations = {
  [province: string]: { [district: string]: string[] };
};

export const LOCATIONS: Locations = {
  Muğla: {
    Fethiye: ["Koca Çalış", "Kayaköy", "Ovacık", "Ölüdeniz", "Hisarönü", "Fethiye Merkez"],
  },
  Antalya: {
    Kalkan: [
      "Kalkan Merkez",
      "İslamlar",
      "Kalamar",
      "Üzümlü",
      "Patara",
      "Sarıbelen",
      "Yeşilköy",
      "Lapaz",
      "Kışla",
      "Kızıltas Mevkii",
    ],
  },
};
