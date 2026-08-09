// src/components/site/FiltersSidebar.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Portal from "@/components/util/Portal";
import {
  getLocationSelectionPreview,
  normalizeCategories,
  normalizeLocationOptions,
  toggleLocationOption,
  type LocationOption,
  type SearchCategory,
} from "@/domain/search/SearchFilterState";
import { SEARCHABLE_FEATURES } from "@/domain/villas/FeatureCatalog";
import { encodeSearchState, decodeSearchState, type SearchState } from "@/lib/shortlink";
import { useAnchoredPosition } from "@/lib/useAnchoredPosition";
import { useMediaQuery } from "@/lib/useMediaQuery";

const GUESTS_MIN = 1;
const GUESTS_MAX = 21;
const PRICE_MIN = 1000;
const PRICE_MAX = 100000;
const PRICE_STEP = 100;
const MIN_GAP = 100;
const FILTER_QUERY_KEYS = new Set([
  "s",
  "checkin",
  "nights",
  "guests",
  "province",
  "district",
  "neighborhood",
  "category",
  "feature",
  "price_min",
  "price_max",
  "minPrice",
  "maxPrice",
]);

type PopupName = "region" | "date" | "category" | "guests";

type DayPickerCssVars = CSSProperties & {
  "--rdp-cell-size"?: string;
  "--rdp-caption-font-size"?: string;
  "--rdp-day_button-width"?: string;
  "--rdp-day_button-height"?: string;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function buildInitialDateRange(checkin: string | undefined, nights: number): DateRange | undefined {
  if (!checkin) return undefined;

  const from = parseISO(checkin);
  if (Number.isNaN(from.getTime())) return undefined;

  return { from, to: addDays(from, Math.max(1, nights)) };
}

function hasFilterQuery(searchParams: ReturnType<typeof useSearchParams>) {
  return Array.from(searchParams.keys()).some((key) => FILTER_QUERY_KEYS.has(key));
}

export default function FiltersSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const isNarrowCalendar = useMediaQuery("(max-width: 767px)");
  const calendarMonths = isNarrowCalendar ? 1 : 2;

  const sState = decodeSearchState(sp.get("s"));
  const initCheckin = (sState?.checkin as string) || sp.get("checkin") || undefined;
  const initNights = clampNumber(Number(sState?.nights ?? sp.get("nights") ?? 7), 1, 60, 7);
  const initGuests = clampNumber(Number(sState?.guests ?? sp.get("guests") ?? 2), 1, 21, 2);
  const initP = (sState?.provinces as string[]) ?? sp.getAll("province");
  const initD = (sState?.districts as string[]) ?? sp.getAll("district");
  const initN = (sState?.neighborhoods as string[]) ?? sp.getAll("neighborhood");
  const initCats = (sState?.categories as string[]) ?? sp.getAll("category");
  const initFeatures = (sState?.features as string[]) ?? sp.getAll("feature");
  const initMinPriceRaw = Number(
    (sState?.price_min as number | undefined) ??
      sp.get("price_min") ??
      sp.get("minPrice") ??
      PRICE_MIN,
  );
  const initMaxPriceRaw = Number(
    (sState?.price_max as number | undefined) ??
      sp.get("price_max") ??
      sp.get("maxPrice") ??
      PRICE_MAX,
  );

  const regionBtnRef = useRef<HTMLButtonElement | null>(null);
  const dateBtnRef = useRef<HTMLButtonElement | null>(null);
  const categoryBtnRef = useRef<HTMLButtonElement | null>(null);
  const guestsBtnRef = useRef<HTMLButtonElement | null>(null);
  const regionPanelRef = useRef<HTMLDivElement | null>(null);
  const datePanelRef = useRef<HTMLDivElement | null>(null);
  const categoryPanelRef = useRef<HTMLDivElement | null>(null);
  const guestsPanelRef = useRef<HTMLDivElement | null>(null);

  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>(initCats);
  const [openCats, setOpenCats] = useState(false);
  const [openRegion, setOpenRegion] = useState(false);
  const [openCal, setOpenCal] = useState(false);
  const [openGuests, setOpenGuests] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [selP, setSelP] = useState<string[]>(initP);
  const [selD, setSelD] = useState<string[]>(initD);
  const [selN, setSelN] = useState<string[]>(initN);
  const [range, setRange] = useState<DateRange | undefined>(() =>
    buildInitialDateRange(initCheckin, initNights),
  );
  const [guests, setGuests] = useState<number>(initGuests);
  const [featureSet, setFeatureSet] = useState<Set<string>>(new Set(initFeatures));

  const clampedInitMin = Math.max(
    PRICE_MIN,
    Math.min(initMinPriceRaw, initMaxPriceRaw - PRICE_STEP),
  );
  const clampedInitMax = Math.min(
    PRICE_MAX,
    Math.max(initMaxPriceRaw, initMinPriceRaw + PRICE_STEP),
  );
  const [minPrice, setMinPrice] = useState<number>(clampedInitMin);
  const [maxPrice, setMaxPrice] = useState<number>(clampedInitMax);
  const hasActiveFilterQuery = hasFilterQuery(sp);

  const regionPos = useAnchoredPosition(openRegion, regionBtnRef, {
    minWidth: 320,
    maxWidth: 420,
    placement: isNarrowCalendar ? "bottom-start" : "right-start",
  });
  const datePos = useAnchoredPosition(openCal, dateBtnRef, {
    minWidth: isNarrowCalendar ? 320 : 660,
    maxWidth: 720,
    placement: isNarrowCalendar ? "bottom-start" : "right-start",
  });
  const categoryPos = useAnchoredPosition(openCats, categoryBtnRef, {
    minWidth: 300,
    maxWidth: 360,
    placement: isNarrowCalendar ? "bottom-start" : "right-start",
  });
  const guestsPos = useAnchoredPosition(openGuests, guestsBtnRef, {
    minWidth: 220,
    maxWidth: 220,
    placement: isNarrowCalendar ? "bottom-start" : "right-start",
  });

  const today = useMemo(() => startOfDay(new Date()), []);
  const checkin = range?.from;
  const checkout = range?.to;
  const selectedNights = useMemo(() => {
    if (!checkin || !checkout) return null;
    return Math.max(1, differenceInCalendarDays(checkout, checkin));
  }, [checkin, checkout]);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/locations?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && !ctrl.signal.aborted) {
          setOptions(normalizeLocationOptions(json));
        }
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        console.error("locations load error:", err);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!abort) setCategories(normalizeCategories(json));
      } catch (err: unknown) {
        console.error("categories load error:", err);
      }
    })();

    return () => {
      abort = true;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closePopups();
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        openRegion &&
        !regionPanelRef.current?.contains(target) &&
        !regionBtnRef.current?.contains(target)
      ) {
        setOpenRegion(false);
      }
      if (
        openCal &&
        !datePanelRef.current?.contains(target) &&
        !dateBtnRef.current?.contains(target)
      ) {
        setOpenCal(false);
      }
      if (
        openCats &&
        !categoryPanelRef.current?.contains(target) &&
        !categoryBtnRef.current?.contains(target)
      ) {
        setOpenCats(false);
      }
      if (
        openGuests &&
        !guestsPanelRef.current?.contains(target) &&
        !guestsBtnRef.current?.contains(target)
      ) {
        setOpenGuests(false);
      }
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [openCal, openCats, openGuests, openRegion]);

  function closePopups() {
    setOpenRegion(false);
    setOpenCal(false);
    setOpenCats(false);
    setOpenGuests(false);
  }

  function togglePopup(name: PopupName, nextOpen: boolean) {
    setOpenRegion(name === "region" ? nextOpen : false);
    setOpenCal(name === "date" ? nextOpen : false);
    setOpenCats(name === "category" ? nextOpen : false);
    setOpenGuests(name === "guests" ? nextOpen : false);
  }

  function toggleSel(option: LocationOption) {
    const next = toggleLocationOption(
      { provinces: selP, districts: selD, neighborhoods: selN },
      option,
    );
    setSelP(next.provinces);
    setSelD(next.districts);
    setSelN(next.neighborhoods);
  }

  function toggleFeature(key: string) {
    setFeatureSet((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function onMinPriceChange(value: number) {
    setMinPrice(Math.min(Math.max(PRICE_MIN, value), Math.max(PRICE_MIN, maxPrice - MIN_GAP)));
  }

  function onMaxPriceChange(value: number) {
    setMaxPrice(Math.max(Math.min(PRICE_MAX, value), Math.min(PRICE_MAX, minPrice + MIN_GAP)));
  }

  function buildState(): SearchState {
    return {
      checkin: checkin ? format(checkin, "yyyy-MM-dd") : null,
      nights: selectedNights ?? undefined,
      guests,
      provinces: selP,
      districts: selD,
      neighborhoods: selN,
      categories: selectedCats,
      features: Array.from(featureSet),
      price_min: minPrice,
      price_max: maxPrice,
    };
  }

  function ensureCompleteDateRange() {
    if (range?.from && !range.to) {
      setDateError(true);
      togglePopup("date", true);
      return false;
    }
    return true;
  }

  function handleSearch() {
    if (!ensureCompleteDateRange()) return;
    const s = encodeSearchState(buildState());
    closePopups();
    router.push(`${pathname}?s=${s}`, { scroll: false });
  }

  function handleClearFilters() {
    closePopups();
    setDateError(false);
    setQuery("");
    setSelP([]);
    setSelD([]);
    setSelN([]);
    setSelectedCats([]);
    setRange(undefined);
    setGuests(2);
    setFeatureSet(new Set());
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    window.location.assign(pathname);
  }

  async function handleCopyShortLink() {
    if (!ensureCompleteDateRange()) return;
    const s = encodeSearchState(buildState());
    const shortUrl = `${window.location.origin}${pathname}?s=${s}`;

    try {
      await navigator.clipboard.writeText(shortUrl);
      alert("Kısa link kopyalandı!");
    } catch {
      alert(shortUrl);
    }
  }

  const locationPreview = getLocationSelectionPreview(
    { provinces: selP, districts: selD, neighborhoods: selN },
    3,
  );
  const dayPickerStyle: DayPickerCssVars = {
    "--rdp-cell-size": isNarrowCalendar ? "34px" : "36px",
    "--rdp-caption-font-size": "14px",
    "--rdp-day_button-width": isNarrowCalendar ? "34px" : "36px",
    "--rdp-day_button-height": isNarrowCalendar ? "34px" : "36px",
  };
  const dateLabel =
    checkin && checkout
      ? `Giriş: ${format(checkin, "d MMM yyyy", { locale: tr })} · Çıkış: ${format(checkout, "d MMM yyyy", { locale: tr })}`
      : checkin
        ? `Giriş: ${format(checkin, "d MMM yyyy", { locale: tr })} · Çıkış: —`
        : "Tarih seçiniz...";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <div className="relative">
          <Label className="text-xs">Bölge</Label>
          <button
            ref={regionBtnRef}
            type="button"
            onClick={() => togglePopup("region", !openRegion)}
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
          >
            {locationPreview ? (
              <span className="block truncate text-sm">{locationPreview}</span>
            ) : (
              <span className="text-sm text-gray-500">Bölge seçiniz...</span>
            )}
          </button>
        </div>

        <div className="relative">
          <Label className="text-xs">Tarih</Label>
          <button
            ref={dateBtnRef}
            type="button"
            onClick={() => togglePopup("date", !openCal)}
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
          >
            <span className="block truncate text-sm">{dateLabel}</span>
          </button>
          {dateError && (
            <div className="mt-1 inline-block rounded border border-orange-200 bg-orange-50 px-2 py-1 text-xs text-orange-700">
              Çıkış tarihi seçiniz
            </div>
          )}
        </div>

        <div className="relative">
          <Label className="text-xs">Kategori</Label>
          <button
            ref={categoryBtnRef}
            type="button"
            onClick={() => togglePopup("category", !openCats)}
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
          >
            {selectedCats.length > 0 ? (
              <span className="block truncate text-sm">
                {selectedCats.slice(0, 3).join(", ")}
                {selectedCats.length > 3 ? " +" : ""}
              </span>
            ) : (
              <span className="text-sm text-gray-500">Kategori seçiniz...</span>
            )}
          </button>
        </div>

        <div className="relative">
          <Label className="text-xs">Kişi Sayısı</Label>
          <button
            ref={guestsBtnRef}
            type="button"
            onClick={() => togglePopup("guests", !openGuests)}
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
          >
            <span className="text-sm">{guests} kişi</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Bütçe (₺/gece)</span>
            <span className="shrink-0 text-xs text-gray-600">
              {minPrice.toLocaleString("tr-TR")} - {maxPrice.toLocaleString("tr-TR")}
            </span>
          </div>

          <div className="range-wrap">
            <div className="range-track" />
            <div
              className="range-progress"
              style={{
                left: `${((minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
                right: `${100 - ((maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={minPrice}
              onChange={(event) => onMinPriceChange(Number(event.target.value))}
              className="range-input z-20"
              aria-label="Minimum fiyat"
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(Number(event.target.value))}
              className="range-input z-10"
              aria-label="Maksimum fiyat"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-slate-50">
          <button
            type="button"
            onClick={() => setFeaturesOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
            aria-expanded={featuresOpen}
          >
            <span>
              <span className="block text-xs font-medium">Özellikler</span>
              <span className="text-xs text-gray-500">
                {featureSet.size > 0 ? `${featureSet.size} özellik seçili` : "Seçim yok"}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                featuresOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {featuresOpen && (
            <div className="max-h-[18rem] space-y-2 overflow-auto border-t p-3">
              {SEARCHABLE_FEATURES.map((feature) => (
                <label key={feature.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={featureSet.has(feature.key)}
                    onChange={() => toggleFeature(feature.key)}
                    className="h-4 w-4"
                  />
                  <span>{feature.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t bg-white p-4 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
        <Button variant="primary" className="w-full" onClick={handleSearch}>
          Ara
        </Button>
        <Button variant="outline" className="w-full" onClick={handleCopyShortLink}>
          Filtre Linkini Kopyala
        </Button>
        {hasActiveFilterQuery && (
          <Button variant="ghost" className="w-full text-slate-600" onClick={handleClearFilters}>
            Filtreleri Temizle
          </Button>
        )}
      </div>

      {openRegion && (
        <Portal>
          <div
            ref={regionPanelRef}
            style={{
              position: "fixed",
              top: regionPos.top,
              left: regionPos.left,
              width: regionPos.width,
            }}
            className="z-[9999] max-h-[22rem] overflow-auto rounded-md border bg-white p-3 shadow-xl"
          >
            <Input
              placeholder="Antalya, Kalkan, İslamlar..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mb-2"
            />
            <ul className="space-y-1">
              {options.map((option) => {
                const checked =
                  (option.type === "province" && selP.includes(option.value)) ||
                  (option.type === "district" && selD.includes(option.value)) ||
                  (option.type === "neighborhood" && selN.includes(option.value));

                return (
                  <li key={`${option.type}:${option.value}`}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSel(option)}
                        className="h-4 w-4"
                      />
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          {option.type}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <SelectedLocationChips provinces={selP} districts={selD} neighborhoods={selN} />
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpenRegion(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Portal>
      )}

      {openCal && (
        <Portal>
          <div
            ref={datePanelRef}
            style={{
              position: "fixed",
              top: datePos.top,
              left: datePos.left,
              width: datePos.width,
            }}
            className="z-[9999] max-h-[min(82vh,36rem)] overflow-auto overflow-x-hidden rounded-lg border bg-white p-3 shadow-xl"
          >
            <DayPicker
              locale={tr}
              mode="range"
              numberOfMonths={calendarMonths}
              showOutsideDays={false}
              selected={range}
              onSelect={(nextRange) => {
                setRange(nextRange ?? undefined);
                if (nextRange?.from && nextRange?.to) setDateError(false);
              }}
              disabled={{ before: today }}
              className="filter-range-calendar !text-[13px]"
              style={dayPickerStyle}
              styles={{
                months: {
                  display: "grid",
                  gridTemplateColumns: isNarrowCalendar ? "1fr" : "1fr 1fr",
                  gap: isNarrowCalendar ? "12px" : "18px",
                  alignItems: "start",
                },
                month: { margin: 0 },
                month_grid: { width: "100%" },
              }}
            />

            {checkin && checkout && selectedNights && (
              <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-700 sm:grid-cols-3">
                <span>Check-in: {format(checkin, "d MMM yyyy", { locale: tr })}</span>
                <span>Check-out: {format(checkout, "d MMM yyyy", { locale: tr })}</span>
                <span>{selectedNights} gece</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
              <CalendarLegend
                style={{ background: "linear-gradient(135deg, white 50%, #fed7aa 50%)" }}
                label="Check-in"
              />
              <CalendarLegend colorClass="bg-orange-100" label="Konaklama" />
              <CalendarLegend
                style={{ background: "linear-gradient(135deg, #fed7aa 50%, white 50%)" }}
                label="Check-out"
              />
            </div>

            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpenCal(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Portal>
      )}

      {openCats && (
        <Portal>
          <div
            ref={categoryPanelRef}
            style={{
              position: "fixed",
              top: categoryPos.top,
              left: categoryPos.left,
              width: categoryPos.width,
            }}
            className="z-[9999] max-h-[20rem] overflow-auto rounded-md border bg-white p-3 shadow-xl"
          >
            <div className="grid grid-cols-1 gap-2">
              {categories.map((category) => {
                const checked = selectedCats.includes(category.slug);

                return (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={() => {
                        setSelectedCats((current) =>
                          checked
                            ? current.filter((slug) => slug !== category.slug)
                            : [...current, category.slug],
                        );
                      }}
                    />
                    <span>{category.name}</span>
                  </label>
                );
              })}
            </div>

            {selectedCats.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3">
                {selectedCats.map((slug) => (
                  <span
                    key={slug}
                    className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800"
                  >
                    {slug}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpenCats(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Portal>
      )}

      {openGuests && (
        <Portal>
          <div
            ref={guestsPanelRef}
            style={{
              position: "fixed",
              top: guestsPos.top,
              left: guestsPos.left,
              width: guestsPos.width,
            }}
            className="z-[9999] rounded-md border bg-white p-3 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setGuests((value) => Math.max(GUESTS_MIN, value - 1))}
                disabled={guests <= GUESTS_MIN}
                aria-label="Kişi sayısını azalt"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="min-w-16 text-center">
                <div className="text-lg font-semibold tabular-nums">{guests}</div>
                <div className="text-xs text-gray-500">kişi</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setGuests((value) => Math.min(GUESTS_MAX, value + 1))}
                disabled={guests >= GUESTS_MAX}
                aria-label="Kişi sayısını artır"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function SelectedLocationChips({
  provinces,
  districts,
  neighborhoods,
}: {
  provinces: string[];
  districts: string[];
  neighborhoods: string[];
}) {
  const values = [
    ...provinces.map((value) => `p:${value}`),
    ...districts.map((value) => `d:${value}`),
    ...neighborhoods.map((value) => `n:${value}`),
  ];

  if (values.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-3">
      {values.map((item) => {
        const [, value] = item.split(":");
        return (
          <span key={item} className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
            {value}
          </span>
        );
      })}
    </div>
  );
}

function CalendarLegend({
  label,
  colorClass,
  style,
}: {
  label: string;
  colorClass?: string;
  style?: CSSProperties;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-5 rounded border ${colorClass ?? ""}`} style={style} />
      <span>{label}</span>
    </span>
  );
}
