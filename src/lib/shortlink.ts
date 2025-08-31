// src/lib/shortlink.ts
import LZString from "lz-string";

// Arama filtresi durumunuzun şeması.
// Not: İhtiyaca göre alan ekleyip çıkarabilirsiniz.
export type SearchState = {
  checkin?: string | null; // "yyyy-MM-dd"
  nights?: number;
  guests?: number;
  provinces?: string[];
  districts?: string[];
  neighborhoods?: string[];
  categories?: string[];
  features?: string[];
  price_min?: number;
  price_max?: number;
};

export function encodeSearchState(state: SearchState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeSearchState(s: string | null): SearchState | null {
  if (!s) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(s);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}
