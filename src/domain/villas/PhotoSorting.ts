export type VillaPhotoLike = {
  url?: string | null;
  is_primary?: boolean | null;
  order_index?: number | null;
};

const MISSING_ORDER_INDEX = 999;

export function compareVillaPhotos(a: VillaPhotoLike, b: VillaPhotoLike) {
  const primaryDiff = (a.is_primary ? 0 : 1) - (b.is_primary ? 0 : 1);
  if (primaryDiff !== 0) return primaryDiff;
  return (a.order_index ?? MISSING_ORDER_INDEX) - (b.order_index ?? MISSING_ORDER_INDEX);
}

export function sortVillaPhotos<T extends VillaPhotoLike>(photos: readonly T[] | null | undefined) {
  return [...(photos ?? [])].sort(compareVillaPhotos);
}

export function getSortedVillaPhotoUrls<T extends VillaPhotoLike>(
  photos: readonly T[] | null | undefined,
) {
  return sortVillaPhotos(photos)
    .map((photo) => photo.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}

export function getVillaCoverUrl<T extends VillaPhotoLike>(
  photos: readonly T[] | null | undefined,
) {
  return getSortedVillaPhotoUrls(photos)[0] ?? null;
}
