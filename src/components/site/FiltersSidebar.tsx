// src/components/search/FiltersSidebar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_DEFS } from "@/lib/categories"; // kategori isim & slug listesi

// Özellik listesi: DB boolean kolon adları + etiket
// (repo’da /src/lib/features.ts varsa ordan import edebilirsin; yoksa bu listeyi kullan)
const FEATURES: Array<{ key: string; label: string }> = [
  { key: "private_pool", label: "Özel Havuz" },
  { key: "heated_pool", label: "Isıtmalı Havuz" },
  { key: "indoor_pool", label: "Kapalı Havuz" },
  { key: "sheltered_pool", label: "Korunaklı Havuz" },
  { key: "jacuzzi", label: "Jakuzi" },
  { key: "sauna", label: "Sauna" },
  { key: "hammam", label: "Hamam" },
  { key: "fireplace", label: "Şömine" },
  { key: "pet_friendly", label: "Evcil Hayvan İzinli" },
  { key: "internet", label: "İnternet" },
  { key: "master_bathroom", label: "Ebeveyn Banyosu" },
  { key: "children_pool", label: "Çocuk Havuzu" },
  { key: "in_site", label: "Site İçinde" },
  { key: "playground", label: "Oyun Alanı" },
  { key: "billiards", label: "Bilardo" },
  { key: "table_tennis", label: "Masa Tenisi" },
  { key: "foosball", label: "Langırt" },
  { key: "underfloor_heating", label: "Yerden Isıtma" },
  { key: "generator", label: "Jeneratör" },
];

type Option = { type: "province" | "district" | "neighborhood"; value: string; label: string };

const NIGHTS_MIN = 1;
const NIGHTS_MAX = 60;
const GUESTS_MIN = 1;
const GUESTS_MAX = 21;
// Bütçe varsayılan aralığı (₺/gece)
const PRICE_MIN = 1000;
const PRICE_MAX = 100000;
const PRICE_STEP = 100;

// --- Kategoriler ---
type Category = { id: string; name: string; slug: string };

export default function FiltersSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // URL’den başlangıç değerleri
  const initCheckin = sp.get("checkin") || undefined;
  const initNights = Number(sp.get("nights") ?? 7);
  const initGuests = Number(sp.get("guests") ?? 2);
  const initP = sp.getAll("province");
  const initD = sp.getAll("district");
  const initN = sp.getAll("neighborhood");
  const initMinPrice = Number(sp.get("minPrice") ?? PRICE_MIN);
  const initMaxPrice = Number(sp.get("maxPrice") ?? PRICE_MAX);
  const initFeatures = sp.getAll("feature"); // &feature=heated_pool&feature=sauna ...

  // URL -> başlangıç kategorileri (slug)
  const initCats = sp.getAll("category"); // ?category=denize-yakin&category=...
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>(initCats);

  // Kategoriler popover & seçim
  const [openCats, setOpenCats] = useState(false);
  const [selCats, setSelCats] = useState<string[]>(initCats);
  function toggleCat(slug: string) {
    setSelCats((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  // Bölge popover state
  const [openRegion, setOpenRegion] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [selP, setSelP] = useState<string[]>(initP);
  const [selD, setSelD] = useState<string[]>(initD);
  const [selN, setSelN] = useState<string[]>(initN);

  // Takvim & nights
  const [openCal, setOpenCal] = useState(false);
  const [nights, setNights] = useState<number>(
    Math.max(NIGHTS_MIN, Math.min(NIGHTS_MAX, initNights || 7)),
  );
  const [checkin, setCheckin] = useState<Date | undefined>(
    initCheckin ? parseISO(initCheckin) : undefined,
  );
  const checkout = useMemo(
    () => (checkin ? addDays(checkin, nights) : undefined),
    [checkin, nights],
  );

  // Guests
  const [openGuests, setOpenGuests] = useState(false);
  const [guests, setGuests] = useState<number>(
    Math.max(GUESTS_MIN, Math.min(GUESTS_MAX, initGuests || 2)),
  );

  // Features
  const [featureSet, setFeatureSet] = useState<Set<string>>(new Set(initFeatures));

  // Price range (double thumb)
  const [minPrice, setMinPrice] = useState<number>(initMinPrice);
  const [maxPrice, setMaxPrice] = useState<number>(initMaxPrice);

  // Bölge autocomplete
  // Bölge autocomplete
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
          setOptions((json?.options ?? []) as Option[]);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
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
        if (!abort) setCategories(json?.items ?? json ?? []);
      } catch (_) {
        // yut
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  function toggleSel(o: Option) {
    const map = {
      province: [selP, setSelP] as const,
      district: [selD, setSelD] as const,
      neighborhood: [selN, setSelN] as const,
    }[o.type];
    const [arr, setArr] = map;
    if (arr.includes(o.value)) setArr(arr.filter((x) => x !== o.value));
    else setArr([...arr, o.value]);
  }

  const today = startOfDay(new Date());
  const pastDaysMatcher = { before: today };

  // Feature toggle
  function toggleFeature(key: string) {
    const s = new Set(featureSet);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    setFeatureSet(s);
  }

  // Price slider overlap koruması
  const minGap = 100; // en az 100₺ fark
  function onMinPriceChange(val: number) {
    setMinPrice(Math.min(val, maxPrice - minGap));
  }
  function onMaxPriceChange(val: number) {
    setMaxPrice(Math.max(val, minPrice + minGap));
  }

  // ARAMA
  function handleSearch() {
    const params = new URLSearchParams();

    selP.forEach((v) => params.append("province", v));
    selD.forEach((v) => params.append("district", v));
    selN.forEach((v) => params.append("neighborhood", v));
    selCats.forEach((slug) => params.append("category", slug));
    selectedCats.forEach((slug) => params.append("category", slug));

    if (checkin) params.set("checkin", format(checkin, "yyyy-MM-dd"));
    params.set("nights", String(nights));
    params.set("guests", String(guests));

    FEATURES.forEach((f) => {
      if (featureSet.has(f.key)) params.append("feature", f.key);
    });

    params.set("minPrice", String(minPrice));
    params.set("maxPrice", String(maxPrice));

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Bölge */}
      <div className="relative">
        <Label className="text-xs">Bölge</Label>
        <button
          type="button"
          onClick={() => setOpenRegion((v) => !v)}
          className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
        >
          {selP.length + selD.length + selN.length > 0 ? (
            <span className="text-sm">
              {selP.concat(selD).concat(selN).slice(0, 3).join(", ")}
              {selP.length + selD.length + selN.length > 3 ? " +" : ""}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Bölge seçiniz…</span>
          )}
        </button>
        {openRegion && (
          <div className="absolute z-[70] mt-1 w-[24rem] max-h-[22rem] overflow-auto rounded-md border bg-white p-3 shadow-xl">
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
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpenRegion(false)}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tarih + Gece Sayısı */}
      <div className="relative">
        <Label className="text-xs">Tarih</Label>
        <button
          type="button"
          onClick={() => setOpenCal((v) => !v)}
          className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
        >
          {checkin ? (
            <span className="text-sm">
              Giriş: {format(checkin, "d MMM yyyy", { locale: tr })} · Çıkış:{" "}
              {checkout ? format(checkout, "d MMM yyyy", { locale: tr }) : "—"}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Tarih seçiniz…</span>
          )}
        </button>

        {openCal && (
          <div className="absolute z-[70] mt-1 w-[34rem] rounded-md border bg-white p-3 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Kalınacak Gece Sasyısı?</span>
              <select
                value={nights}
                onChange={(e) => {
                  const n = Math.max(NIGHTS_MIN, Math.min(NIGHTS_MAX, Number(e.target.value)));
                  // nights değişince checkout otomatik güncellenecek (memo)
                  // checkin seçili değilse sadece state güncellenir
                  // görsel amaçlı yeterli

                  setNights(n);
                }}
                className="border rounded px-2 py-2 text-sm"
              >
                {Array.from({ length: NIGHTS_MAX - NIGHTS_MIN + 1 }, (_, i) => i + NIGHTS_MIN).map(
                  (n) => (
                    <option key={n} value={n}>
                      {n} gece
                    </option>
                  ),
                )}
              </select>
            </div>

            <DayPicker
              mode="single"
              selected={checkin ?? undefined}
              onSelect={(d) => d && setCheckin(d)}
              numberOfMonths={2}
              showOutsideDays
              locale={tr}
              disabled={pastDaysMatcher}
              className="rdp-vertical-lg"
              style={
                {
                  // TS için cast gerekli olabilir:
                  ["--rdp-cell-size" as any]: "34px",
                } as React.CSSProperties
              }
              styles={{
                months: {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px", // iki ay arası boşluk
                  margin: 0,
                },
                month: { margin: 0 },
                head_cell: { fontWeight: 700 }, // gün kısaltmaları kalın
                caption_label: { fontWeight: 700, fontSize: "1.1rem" },
                table: { width: "100%" },
              }}
              /* görsel tarama: giriş + nights-1 */
              modifiers={{
                range:
                  checkin && checkout
                    ? { from: checkin, to: addDays(checkin, nights - 1) }
                    : undefined,
                disabled: { before: new Date() }, // geçmiş günleri kilitle
              }}
              modifiersStyles={{
                range: { backgroundColor: "rgba(251,146,60,.18)" },
              }}
            />
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpenCal(false)}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Kategoriler */}
      <div className="relative">
        <Label className="text-xs">Kategori</Label>
        <button
          type="button"
          onClick={() => setOpenCats((v) => !v)}
          className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
        >
          {selectedCats.length > 0 ? (
            <span className="text-sm">
              {selectedCats.slice(0, 3).join(", ")}
              {selectedCats.length > 3 ? " +" : ""}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Kategori seçiniz…</span>
          )}
        </button>

        {openCats && (
          <div className="absolute z-[70] mt-1 w-[22rem] max-h-[18rem] overflow-auto rounded-md border bg-white p-3 shadow-xl">
            <div className="grid grid-cols-1 gap-2">
              {categories.map((c) => {
                const checked = selectedCats.includes(c.slug);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={() => {
                        setSelectedCats((prev) =>
                          checked ? prev.filter((s) => s !== c.slug) : [...prev, c.slug],
                        );
                      }}
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>

            {selectedCats.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {selectedCats.map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded"
                  >
                    {s}
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
        )}
      </div>

      {/* Kişi sayısı */}
      <div className="relative">
        <Label className="text-xs">Kişi Sayısı</Label>
        <button
          type="button"
          onClick={() => setOpenGuests((v) => !v)}
          className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
        >
          <span className="text-sm">{guests} kişi</span>
        </button>
        {openGuests && (
          <div className="absolute z-[70] mt-1 w-56 rounded-md border bg-white p-3 shadow-xl">
            <input
              type="range"
              min={GUESTS_MIN}
              max={GUESTS_MAX}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 text-sm text-gray-600">Seçilen: {guests}</div>
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpenGuests(false)}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bütçe (gecelik) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Bütçe (₺/gece)</span>
          <span className="text-xs text-gray-600">
            {minPrice.toLocaleString("tr-TR")} – {maxPrice.toLocaleString("tr-TR")}
          </span>
        </div>

        <div className="range-wrap">
          {/* Gri ana track */}
          <div className="range-track" />

          {/* Turuncu seçili aralık barı */}
          <div
            className="range-progress"
            /* MIN/MAX’i kendi state’inize göre hesaplayın */
            style={{
              left: `${((minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
              right: `${100 - ((maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
            }}
          />

          {/* Min thumb */}
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={minPrice}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), maxPrice - PRICE_STEP);
              setMinPrice(v);
            }}
            className="range-input z-20"
            aria-label="Minimum fiyat"
          />

          {/* Max thumb */}
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={maxPrice}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value), minPrice + PRICE_STEP);
              setMaxPrice(v);
            }}
            className="range-input z-10"
            aria-label="Maksimum fiyat"
          />
        </div>
      </div>

      {/* Özellikler */}
      <div className="rounded-xl border bg-slate-100/90 p-4">
        <Label className="text-xs">Özellikler</Label>
        <div className="mt-2 grid grid-cols-1 gap-2 max-h-[18rem] overflow-auto pr-1">
          {FEATURES.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={featureSet.has(f.key)}
                onChange={() => toggleFeature(f.key)}
                className="h-4 w-4"
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ara */}
      <div className="pt-2">
        <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleSearch}>
          Ara
        </Button>
      </div>

      <style jsx global>{`
        /* 2 ayı yan yana; gün kısaltmalarını kalın; iki ay arasında boşluk */
        .rdp-vertical-lg .rdp-months {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .rdp-vertical-lg .rdp-caption_label {
          font-weight: 600;
        }
        .rdp-vertical-lg .rdp-weekday {
          font-weight: 600;
        }
        .rdp-vertical-lg .rdp-day {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
