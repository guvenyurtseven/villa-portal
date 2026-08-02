export type LocationOption = {
  type: "province" | "district" | "neighborhood";
  value: string;
  label: string;
};

export type SearchCategory = {
  id: string;
  name: string;
  slug: string;
};

export type LocationSelection = {
  provinces: string[];
  districts: string[];
  neighborhoods: string[];
};

export function countSelectedLocations(selection: LocationSelection) {
  return (
    selection.provinces.length + selection.districts.length + selection.neighborhoods.length
  );
}

export function getSelectedLocationValues(selection: LocationSelection) {
  return [...selection.provinces, ...selection.districts, ...selection.neighborhoods];
}

export function getLocationSelectionPreview(selection: LocationSelection, limit: number) {
  const values = getSelectedLocationValues(selection);
  if (values.length === 0) return null;
  const suffix = values.length > limit ? " +" : "";
  return `${values.slice(0, limit).join(", ")}${suffix}`;
}

export function toggleLocationOption(
  selection: LocationSelection,
  option: LocationOption,
): LocationSelection {
  const key =
    option.type === "province"
      ? "provinces"
      : option.type === "district"
        ? "districts"
        : "neighborhoods";

  const current = selection[key];
  const next = current.includes(option.value)
    ? current.filter((value) => value !== option.value)
    : [...current, option.value];

  return {
    ...selection,
    [key]: next,
  };
}

export function normalizeLocationOptions(payload: unknown): LocationOption[] {
  const value = payload as { options?: unknown };
  const options = Array.isArray(value?.options) ? value.options : [];

  return options.filter((option): option is LocationOption => {
    const candidate = option as Partial<LocationOption>;
    return (
      (candidate.type === "province" ||
        candidate.type === "district" ||
        candidate.type === "neighborhood") &&
      typeof candidate.value === "string" &&
      typeof candidate.label === "string"
    );
  });
}

export function normalizeCategories(payload: unknown): SearchCategory[] {
  const value = payload as { items?: unknown };
  const rows = Array.isArray(value?.items) ? value.items : Array.isArray(payload) ? payload : [];

  return rows.filter((row): row is SearchCategory => {
    const category = row as Partial<SearchCategory>;
    return (
      typeof category.id === "string" &&
      typeof category.name === "string" &&
      typeof category.slug === "string"
    );
  });
}
