"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { type: "province" | "district" | "neighborhood"; value: string; label: string };

const NIGHTS_MIN = 1;
const NIGHTS_MAX = 60;
const GUESTS_MIN = 1;
const GUESTS_MAX = 21;

export default function QuickSearch({
  initialCheckin,
  initialNights = 7,
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

  // --- State ---
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [selP, setSelP] = useState<string[]>(initialP);
  const [selD, setSelD] = useState<string[]>(initialD);
  const [selN, setSelN] = useState<string[]>(initialN);

  const [nights, setNights] = useState<number>(initialNights);
  const [guests, setGuests] = useState<number>(initialGuests);

  const [checkin, setCheckin] = useState<Date | undefined>(
    initialCheckin ? parseISO(initialCheckin) : undefined,
  );
  const checkout = useMemo(
    () => (checkin ? addDays(checkin, Math.max(1, Math.min(60, nights))) : undefined),
    [checkin, nights],
  );

  // --- Autocomplete load ---
  useEffect(() => {
    const ctrl = new AbortController();
    const run = async () => {
      const res = await fetch(`/api/locations?q=${encodeURIComponent(query)}`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setOptions(json.options || []);
    };
    run();
    return () => ctrl.abort();
  }, [query]);

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
  const onPickDay = (day: Date) => {
    // Kullanıcı hangi güne tıklarsa o GİRİŞ; çıkış otomatik nights kadar sonrası
    setCheckin(day);
  };
  function makeQS() {
    const params = new URLSearchParams();
    selP.forEach((v) => params.append("province", v));
    selD.forEach((v) => params.append("district", v));
    selN.forEach((v) => params.append("neighborhood", v));
    if (checkin) params.set("checkin", format(checkin, "yyyy-MM-dd"));
    params.set("nights", String(nights));
    params.set("guests", String(guests));
    return params.toString();
  }

  // Tek tıklama: giriş = tıklanan gün, çıkış = giriş + nights
  function handleDayClick(day: Date) {
    setCheckin(day);
  }

  // --- Render ---
  return (
    <div className="w-full mx-auto rounded-xl border bg-white/80 backdrop-blur p-3 md:p-4 shadow-sm">
      <div className="grid md:grid-cols-4 gap-3">
        {/* Bölge */}
        <div className="relative">
          <Label className="text-xs">Bölge</Label>
          <button
            type="button"
            className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => setOpen((v) => !v)}
          >
            {selP.length + selD.length + selN.length > 0 ? (
              <span className="text-sm">
                {selP.concat(selD).concat(selN).slice(0, 2).join(", ")}
                {selP.length + selD.length + selN.length > 2 ? " +" : ""}
              </span>
            ) : (
              <span className="text-sm text-gray-500">Bölge seçiniz…</span>
            )}
          </button>

          {open && (
            <div className="absolute z-20 mt-1 w-[22rem] max-h-[18rem] overflow-auto rounded-md border bg-white p-2 shadow-lg">
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
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Takvim (2 ay yan yana, dış ay günleri görünür) */}
        <div className="md:col-span-2">
          <div className="border rounded-lg p-2 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {checkin
                  ? `Giriş: ${format(checkin, "d MMM yyyy", { locale: tr })} · Çıkış: ${
                      checkout ? format(checkout, "d MMM yyyy", { locale: tr }) : "—"
                    }`
                  : "Tarih seçiniz"}
              </span>

              {/* Gece sayısı seçimi */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Kaç gece?</span>
                <select
                  value={nights}
                  onChange={(e) =>
                    setNights(Math.max(NIGHTS_MIN, Math.min(NIGHTS_MAX, Number(e.target.value))))
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {Array.from(
                    { length: NIGHTS_MAX - NIGHTS_MIN + 1 },
                    (_, i) => i + NIGHTS_MIN,
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n} gece
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DayPicker
              mode="single"
              selected={checkin ?? undefined}
              onSelect={(d) => d && onPickDay(d)}
              numberOfMonths={2}
              showOutsideDays
              locale={tr}
              // görsel tarama: seçilen giriş + nights kadar sonrası
              modifiers={{
                range:
                  checkin && checkout
                    ? { from: checkin, to: addDays(checkin, nights - 1) }
                    : undefined,
              }}
              modifiersStyles={{
                range: {
                  backgroundColor: "rgba(251, 146, 60, 0.2)",
                },
              }}
            />
          </div>
        </div>

        {/* Kişi sayısı + Ara */}
        <div>
          <Label className="text-xs">Kişi Sayısı</Label>
          <select
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Math.min(21, Number(e.target.value))))}
            className="w-full border rounded-md px-3 py-2"
          >
            {Array.from({ length: 21 }, (_, i) => i + 1).map((v) => (
              <option key={v} value={v}>
                {v} kişi
              </option>
            ))}
          </select>

          <Button
            className="mt-3 w-full bg-orange-500 hover:bg-orange-600"
            onClick={() => {
              const qs = makeQS();
              router.push(`/search?${qs}`);
            }}
          >
            Ara
          </Button>
        </div>
      </div>
    </div>
  );
}
