export type FeatureKey =
  | "heated_pool"
  | "sheltered_pool"
  | "tv_satellite"
  | "master_bathroom"
  | "jacuzzi"
  | "fireplace"
  | "children_pool"
  | "in_site"
  | "private_pool"
  | "playground"
  | "internet"
  | "security"
  | "sauna"
  | "hammam"
  | "indoor_pool"
  | "baby_bed"
  | "high_chair"
  | "foosball"
  | "table_tennis"
  | "underfloor_heating"
  | "generator"
  | "billiards"
  | "pet_friendly";

export const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "heated_pool", label: "Isıtmalı Havuz" },
  { key: "sheltered_pool", label: "Korunaklı havuz" },
  { key: "tv_satellite", label: "TV - Uydu" },
  { key: "master_bathroom", label: "Ebeveyn Banyosu" },
  { key: "jacuzzi", label: "Jakuzi" },
  { key: "fireplace", label: "Şömine" },
  { key: "children_pool", label: "Çocuk Havuzu" },
  { key: "in_site", label: "Site İçinde" },
  { key: "private_pool", label: "Özel Havuzlu" },
  { key: "playground", label: "Oyun Alanı" },
  { key: "internet", label: "İnternet Bağlantısı" },
  { key: "security", label: "Güvenlik" },
  { key: "sauna", label: "Sauna" },
  { key: "hammam", label: "Hamam" },
  { key: "indoor_pool", label: "Kapalı Havuz" },
  { key: "baby_bed", label: "Bebek Yatağı" },
  { key: "high_chair", label: "Mama Sandalyesi" },
  { key: "foosball", label: "Langırt" },
  { key: "table_tennis", label: "Masa Tenisi" },
  { key: "underfloor_heating", label: "Yerden Isıtma" },
  { key: "generator", label: "Jeneratör" },
  { key: "billiards", label: "Bilardo" },
  { key: "pet_friendly", label: "Evcil Hayvan İzinli" },
];
