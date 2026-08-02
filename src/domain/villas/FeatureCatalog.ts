type FeatureDefinition<K extends string = string> = {
  key: K;
  label: string;
  searchLabel?: string;
  searchable: boolean;
};

export const FEATURE_CATALOG = [
  { key: "heated_pool", label: "Isıtmalı Havuz", searchable: true },
  {
    key: "sheltered_pool",
    label: "Korunaklı havuz",
    searchLabel: "Korunaklı Havuz",
    searchable: true,
  },
  { key: "tv_satellite", label: "TV - Uydu", searchable: false },
  { key: "master_bathroom", label: "Ebeveyn Banyosu", searchable: true },
  { key: "jacuzzi", label: "Jakuzi", searchable: true },
  { key: "fireplace", label: "Şömine", searchable: true },
  { key: "children_pool", label: "Çocuk Havuzu", searchable: true },
  { key: "in_site", label: "Site İçinde", searchable: true },
  {
    key: "private_pool",
    label: "Özel Havuzlu",
    searchLabel: "Özel Havuz",
    searchable: true,
  },
  { key: "playground", label: "Oyun Alanı", searchable: true },
  {
    key: "internet",
    label: "İnternet Bağlantısı",
    searchLabel: "İnternet",
    searchable: true,
  },
  { key: "security", label: "Güvenlik", searchable: false },
  { key: "sauna", label: "Sauna", searchable: true },
  { key: "hammam", label: "Hamam", searchable: true },
  { key: "indoor_pool", label: "Kapalı Havuz", searchable: true },
  { key: "baby_bed", label: "Bebek Yatağı", searchable: false },
  { key: "high_chair", label: "Mama Sandalyesi", searchable: false },
  { key: "foosball", label: "Langırt", searchable: true },
  { key: "table_tennis", label: "Masa Tenisi", searchable: true },
  { key: "underfloor_heating", label: "Yerden Isıtma", searchable: true },
  { key: "generator", label: "Jeneratör", searchable: true },
  { key: "billiards", label: "Bilardo", searchable: true },
  { key: "pet_friendly", label: "Evcil Hayvan İzinli", searchable: true },
] as const satisfies readonly FeatureDefinition[];

export type FeatureCatalogItem = (typeof FEATURE_CATALOG)[number];
export type FeatureKey = FeatureCatalogItem["key"];

export const FEATURE_DEFS = FEATURE_CATALOG;
export const FEATURE_KEYS = FEATURE_CATALOG.map((feature) => feature.key) as FeatureKey[];

const FEATURE_BY_KEY = new Map<FeatureKey, FeatureCatalogItem>(
  FEATURE_CATALOG.map((feature) => [feature.key, feature]),
);
const FEATURE_KEY_SET = new Set<string>(FEATURE_KEYS);

const SEARCHABLE_FEATURE_KEY_ORDER = [
  "private_pool",
  "heated_pool",
  "indoor_pool",
  "sheltered_pool",
  "jacuzzi",
  "sauna",
  "hammam",
  "fireplace",
  "pet_friendly",
  "internet",
  "master_bathroom",
  "children_pool",
  "in_site",
  "playground",
  "billiards",
  "table_tennis",
  "foosball",
  "underfloor_heating",
  "generator",
] as const satisfies readonly FeatureKey[];

export type SearchableFeatureKey = (typeof SEARCHABLE_FEATURE_KEY_ORDER)[number];

function getFeature(key: FeatureKey) {
  const feature = FEATURE_BY_KEY.get(key);
  if (!feature) {
    throw new Error(`Unknown villa feature key: ${key}`);
  }
  return feature;
}

export function isFeatureKey(key: string): key is FeatureKey {
  return FEATURE_KEY_SET.has(key);
}

export const SEARCHABLE_FEATURE_KEYS = SEARCHABLE_FEATURE_KEY_ORDER;
const SEARCHABLE_FEATURE_KEY_SET = new Set<string>(SEARCHABLE_FEATURE_KEYS);

export function isSearchableFeatureKey(key: string): key is SearchableFeatureKey {
  return SEARCHABLE_FEATURE_KEY_SET.has(key);
}

export const SEARCHABLE_FEATURES = SEARCHABLE_FEATURE_KEY_ORDER.map((key) => {
  const feature = getFeature(key);
  if (!feature.searchable) {
    throw new Error(`Villa feature is not searchable: ${key}`);
  }

  return {
    key,
    label: "searchLabel" in feature ? feature.searchLabel : feature.label,
  };
});
