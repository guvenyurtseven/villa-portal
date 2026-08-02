// src/components/site/QuickSearch.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Portal from "@/components/util/Portal";
import {
  countSelectedLocations,
  getLocationSelectionPreview,
  normalizeCategories,
  normalizeLocationOptions,
  toggleLocationOption,
  type LocationOption,
  type LocationSelection,
  type SearchCategory,
} from "@/domain/search/SearchFilterState";
import { encodeSearchState, type SearchState } from "@/lib/shortlink";
import { useAnchoredPosition } from "@/lib/useAnchoredPosition";
import { useMediaQuery } from "@/lib/useMediaQuery";

const GUESTS_MIN = 1;
const GUESTS_MAX = 12;

type DayPickerCssVars = CSSProperties & {
  "--rdp-cell-size"?: string;
  "--rdp-caption-font-size"?: string;
  "--rdp-day_button-width"?: string;
  "--rdp-day_button-height"?: string;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function QuickSearch({
  initialCheckin,
  initialNights = 7, // Eski davranışla geriye uyum için: varsa checkout'u başlangıçta bundan türetiyoruz
  initialGuests = 2,
  initialP = [],
  initialD = [],
  initialN = [],
}: {
  initialCheckin?: string;
  initialNights?: number;
  initialGuests?: number;
  initialP?: string[];
  initialD?: string[];
  initialN?: string[];
}) {
  const router = useRouter();
  const isNarrowCalendar = useMediaQuery("(max-width: 767px)");
  const calendarMonths = isNarrowCalendar ? 1 : 2;

  // Button refs
  const regionBtnRef = useRef<HTMLButtonElement | null>(null);
  const dateBtnRef = useRef<HTMLButtonElement | null>(null);
  const guestsBtnRef = useRef<HTMLButtonElement | null>(null);
  const catBtnRef = useRef<HTMLButtonElement | null>(null);

  // Panel refs
  const regionPanelRef = useRef<HTMLDivElement | null>(null);
  const datePanelRef = useRef<HTMLDivElement | null>(null);
  const guestsPanelRef = useRef<HTMLDivElement | null>(null);
  const catPanelRef = useRef<HTMLDivElement | null>(null);

  // Open states
  const [regionOpen, setRegionOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [openCats, setOpenCats] = useState(false);

  // Anchor positions
  const regionPos = useAnchoredPosition(regionOpen, regionBtnRef, { maxWidth: 520 });
  const datePos = useAnchoredPosition(dateOpen, dateBtnRef, { minWidth: 320, maxWidth: 680 });
  const guestsPos = useAnchoredPosition(guestsOpen, guestsBtnRef, { minWidth: 208, maxWidth: 208 });
  const catPos = useAnchoredPosition(openCats, catBtnRef, { minWidth: 220, maxWidth: 260 });

  // Region autocomplete
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [selP, setSelP] = useState<string[]>(initialP);
  const [selD, setSelD] = useState<string[]>(initialD);
  const [selN, setSelN] = useState<string[]>(initialN);

  // Guests
  const [guests, setGuests] = useState<number>(initialGuests);

  // Categories
  const [cats, setCats] = useState<SearchCategory[]>([]);
  const [selCats, setSelCats] = useState<string[]>([]); // slug[]

  // Today (local midnight) — disable past days
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  // Tarih aralığı: giriş & çıkış
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (!initialCheckin) return undefined;
    const from = parseISO(initialCheckin);
    if (Number.isNaN(from.getTime())) return undefined;
    const to = addDays(from, Math.max(1, initialNights)); // başlangıç uyumu
    return { from, to };
  });

  // Sadece giriş seçiliyken uyarı göstermek için mini hata
  const [dateError, setDateError] = useState(false);

  // Past safety: seçili giriş geçmişteyse bugüne çek
  useEffect(() => {
    if (range?.from && range.from < today) {
      const d = today;
      // to varsa ve d'den küçük ise hizala
      if (range.to && range.to <= d) {
        setRange({ from: d, to: addDays(d, 1) });
      } else {
        setRange({ from: d, to: range.to });
      }
    }
  }, [range?.from, range?.to, today]);

  // Kategorileri yükle
  useEffect(() => {
    let ignore = false;
    (async () => {
      const r = await fetch("/api/categories", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (!ignore) setCats(normalizeCategories(j));
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Lokasyon arama (abort güvenliği ile)
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

  // Dışarı tıkla & ESC kapat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setRegionOpen(false);
        setDateOpen(false);
        setGuestsOpen(false);
        setOpenCats(false);
      }
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (regionOpen && !regionPanelRef.current?.contains(t) && !regionBtnRef.current?.contains(t))
        setRegionOpen(false);
      if (dateOpen && !datePanelRef.current?.contains(t) && !dateBtnRef.current?.contains(t))
        setDateOpen(false);
      if (guestsOpen && !guestsPanelRef.current?.contains(t) && !guestsBtnRef.current?.contains(t))
        setGuestsOpen(false);
      if (openCats && !catPanelRef.current?.contains(t) && !catBtnRef.current?.contains(t))
        setOpenCats(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [regionOpen, dateOpen, guestsOpen, openCats]);

  function toggleSel(o: LocationOption) {
    const next = toggleLocationOption(
      { provinces: selP, districts: selD, neighborhoods: selN },
      o,
    );
    setSelP(next.provinces);
    setSelD(next.districts);
    setSelN(next.neighborhoods);
  }

  function toggleCat(slug: string) {
    setSelCats((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function handleSearch() {
    // Yalnızca giriş seçiliyse mini uyarı göster ve tarih panelini aç
    if (range?.from && !range.to) {
      setDateError(true);
      setDateOpen(true);
      return;
    }

    // Kısa link state — backend ile uyum için nights'ı aralıktan türetiyoruz (ikisi yoksa null)
    const checkinStr = range?.from ? format(range.from, "yyyy-MM-dd") : null;
    const nights =
      range?.from && range?.to ? Math.max(1, differenceInCalendarDays(range.to, range.from)) : null;

    const state: SearchState = {
      checkin: checkinStr,
      nights: nights ?? undefined, // search API nights kabul ettiği için uyumlu
      guests,
      provinces: selP,
      districts: selD,
      neighborhoods: selN,
      categories: selCats,
    };
    const s = encodeSearchState(state);
    router.push(`/search?s=${s}`);
  }

  // Tarih etiketini hazırla
  const dateLabel = useMemo(() => {
    if (range?.from && range?.to) {
      return `Giriş: ${format(range.from, "d MMM yyyy", { locale: tr })} · Çıkış: ${format(range.to, "d MMM yyyy", { locale: tr })}`;
    }
    if (range?.from && !range?.to) {
      return `Giriş: ${format(range.from, "d MMM yyyy", { locale: tr })} · Çıkış: —`;
    }
    return "Tarih seçiniz";
  }, [range?.from, range?.to]);

  // Kullanıcı çıkış tarihi seçince uyarıyı kapat
  useEffect(() => {
    if (range?.from && range?.to && dateError) setDateError(false);
  }, [range?.from, range?.to, dateError]);

  const locationSelection = useMemo<LocationSelection>(
    () => ({ provinces: selP, districts: selD, neighborhoods: selN }),
    [selP, selD, selN],
  );
  const locationPreview = getLocationSelectionPreview(locationSelection, 2);
  const selectedLocationCount = countSelectedLocations(locationSelection);
  const dayPickerStyle: DayPickerCssVars = {
    "--rdp-cell-size": isNarrowCalendar ? "32px" : "30px",
    "--rdp-caption-font-size": "14px",
    "--rdp-day_button-width": isNarrowCalendar ? "32px" : "30px",
    "--rdp-day_button-height": isNarrowCalendar ? "32px" : "30px",
  };

  return (
    <div className="relative isolate w-full mx-auto rounded-xl border bg-white/80 backdrop-blur p-3 md:p-4 shadow-sm">
      {/* 4 kolon: Bölge | Tarih | Kişi | Kategori | (Ara ayrı satıra düşebilir) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Bölge */}
        <div className="relative">
          <Label className="text-xs">Bölge</Label>
          <button
            ref={regionBtnRef}
            type="button"
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setRegionOpen((v) => !v);
              setDateOpen(false);
              setGuestsOpen(false);
              setOpenCats(false);
            }}
          >
            {locationPreview ? (
              <span className="block truncate text-sm">
                {locationPreview}
              </span>
            ) : (
              <span className="text-sm text-gray-500">Bölge seçiniz…</span>
            )}
          </button>
        </div>

        {/* Tarih */}
        <div className="relative">
          <Label className="text-xs">Tarih</Label>
          <button
            ref={dateBtnRef}
            type="button"
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setDateOpen((v) => !v);
              setRegionOpen(false);
              setGuestsOpen(false);
              setOpenCats(false);
            }}
          >
            <span className="block truncate text-sm">{dateLabel}</span>
          </button>
          {dateError && (
            <div className="mt-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 inline-block">
              Çıkış tarihi seçiniz
            </div>
          )}
        </div>

        {/* Kişi sayısı */}
        <div className="relative">
          <Label className="text-xs">Kişi Sayısı</Label>
          <button
            ref={guestsBtnRef}
            type="button"
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setGuestsOpen((v) => !v);
              setRegionOpen(false);
              setDateOpen(false);
              setOpenCats(false);
            }}
          >
            <span className="text-sm">{guests} kişi</span>
          </button>
        </div>

        {/* Kategori */}
        <div className="relative">
          <Label className="text-xs">Kategori</Label>
          <button
            ref={catBtnRef}
            type="button"
            onClick={() => {
              setOpenCats((v) => !v);
              setRegionOpen(false);
              setDateOpen(false);
              setGuestsOpen(false);
            }}
            aria-expanded={openCats}
            className="min-h-9 w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left hover:bg-gray-50"
          >
            {selCats.length > 0 ? (
              <span className="block truncate text-sm">
                {selCats.slice(0, 2).join(", ")}
                {selCats.length > 2 ? " +" : ""}
              </span>
            ) : (
              <span className="text-sm text-gray-500">Kategori seçiniz…</span>
            )}
          </button>
        </div>

        {/* Ara */}
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button variant="primary" className="w-full" onClick={handleSearch}>
            Filtrele
          </Button>
        </div>
      </div>

      {/* REGION PANEL (Portal) */}
      {regionOpen && (
        <Portal>
          <div
            ref={regionPanelRef}
            style={{
              position: "fixed",
              top: regionPos.top,
              left: regionPos.left,
              width: regionPos.width,
            }}
            className="z-[9999] max-h-[18rem] overflow-auto rounded-md border bg-white p-2 shadow-lg"
          >
            <Input
              placeholder="Antalya, Kalkan, İslamlar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-2"
            />
            <ul className="space-y-1">
              {options.map((o) => {
                const checked =
                  (o.type === "province" && selP.includes(o.value)) ||
                  (o.type === "district" && selD.includes(o.value)) ||
                  (o.type === "neighborhood" && selN.includes(o.value));
                return (
                  <li key={`${o.type}:${o.value}`}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSel(o)}
                        className="h-4 w-4"
                      />
                      <span className="inline-flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          {o.type}
                        </span>
                        <span>{o.label}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {selectedLocationCount > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {selP.map((v) => (
                  <span
                    key={`p:${v}`}
                    className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded"
                  >
                    {v}
                  </span>
                ))}
                {selD.map((v) => (
                  <span
                    key={`d:${v}`}
                    className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded"
                  >
                    {v}
                  </span>
                ))}
                {selN.map((v) => (
                  <span
                    key={`n:${v}`}
                    className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setRegionOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Portal>
      )}

      {/* DATE PANEL (Portal) — geçmiş günler disabled, 2 ay yan yana */}
      {dateOpen && (
        <Portal>
          <div
            ref={datePanelRef}
            style={{
              position: "fixed",
              top: datePos.top,
              left: datePos.left,
              width: isNarrowCalendar ? "calc(100vw - 24px)" : Math.max(620, datePos.width),
              maxWidth: "calc(100vw - 24px)",
            }}
            className="z-[9999] max-h-[min(80vh,34rem)] overflow-auto rounded-lg border bg-white p-3 shadow-lg"
          >
            <DayPicker
              locale={tr}
              mode="range"
              numberOfMonths={calendarMonths}
              showOutsideDays
              selected={range}
              onSelect={(r) => setRange(r ?? undefined)}
              disabled={{ before: today }}
              className="!text-[12px]"
              styles={{
                months: {
                  display: "grid",
                  gridTemplateColumns: isNarrowCalendar ? "1fr" : "1fr 1fr",
                  gap: "16px",
                  alignItems: "start",
                },
                month: { margin: 0 },
              }}
              style={dayPickerStyle}
            />

            <style jsx global>{`
              .rdp-weekday,
              [data-rdp] .rdp-weekday {
                font-weight: 700 !important;
              }
              .rdp-weekdays,
              [data-rdp] .rdp-weekdays {
                margin-bottom: 6px;
              }
            `}</style>

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDateOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Portal>
      )}

      {/* GUESTS PANEL (Portal) */}
      {guestsOpen && (
        <Portal>
          <div
            ref={guestsPanelRef}
            style={{ position: "fixed", top: guestsPos.top, left: guestsPos.left, width: 208 }}
            className="z-[9999] max-h-64 overflow-auto rounded-md border bg-white p-2 shadow-lg"
          >
            <ul className="grid grid-cols-3 gap-1">
              {Array.from({ length: GUESTS_MAX - GUESTS_MIN + 1 }, (_, i) => i + GUESTS_MIN).map(
                (v) => (
                  <li key={v}>
                    <button
                      type="button"
                      onClick={() => {
                        setGuests(v);
                        setGuestsOpen(false);
                      }}
                      className={`w-full rounded px-2 py-1 text-sm hover:bg-gray-100 ${
                        v === guests ? "bg-orange-100 text-orange-800" : ""
                      }`}
                    >
                      {v}
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        </Portal>
      )}

      {/* CATEGORY PANEL (Portal) */}
      {openCats && (
        <Portal>
          <div
            ref={catPanelRef}
            style={{
              position: "fixed",
              top: catPos.top,
              left: catPos.left,
              width: Math.max(200, Math.min(240, catPos.width)),
              maxHeight: 320,
              overflow: "auto",
            }}
            className="z-[9999] rounded-md border bg-white p-2 shadow-2xl"
          >
            <ul className="space-y-1">
              {cats.map((c) => {
                const checked = selCats.includes(c.slug);
                return (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCat(c.slug)}
                        className="h-4 w-4"
                      />
                      <span>{c.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpenCats(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
