"use client";

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Portal from "@/components/util/Portal";

type Option = { type: "province" | "district" | "neighborhood"; value: string; label: string };

const NIGHTS_MIN = 1;
const NIGHTS_MAX = 60;
const GUESTS_MIN = 1;
const GUESTS_MAX = 12;

function useAnchorPosition(open: boolean, btnRef: React.RefObject<HTMLElement>) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  useLayoutEffect(() => {
    function calc() {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const margin = 8;
      const maxW = Math.min(720, window.innerWidth - 32);
      setPos({
        top: r.bottom + window.scrollY + margin,
        left: Math.min(r.left + window.scrollX, window.innerWidth - maxW - 16),
        width: Math.min(Math.max(320, r.width), maxW),
      });
    }
    if (open) {
      calc();
      window.addEventListener("resize", calc);
      window.addEventListener("scroll", calc, true);
      return () => {
        window.removeEventListener("resize", calc);
        window.removeEventListener("scroll", calc, true);
      };
    }
  }, [open, btnRef]);

  return pos;
}

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

  const regionBtnRef = useRef<HTMLButtonElement | null>(null);
  const dateBtnRef = useRef<HTMLButtonElement | null>(null);
  const guestsBtnRef = useRef<HTMLButtonElement | null>(null);

  const regionPanelRef = useRef<HTMLDivElement | null>(null);
  const datePanelRef = useRef<HTMLDivElement | null>(null);
  const guestsPanelRef = useRef<HTMLDivElement | null>(null);

  const [regionOpen, setRegionOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const regionPos = useAnchorPosition(regionOpen, regionBtnRef);
  const datePos = useAnchorPosition(dateOpen, dateBtnRef);
  const guestsPos = useAnchorPosition(guestsOpen, guestsBtnRef);

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [selP, setSelP] = useState<string[]>(initialP);
  const [selD, setSelD] = useState<string[]>(initialD);
  const [selN, setSelN] = useState<string[]>(initialN);

  const [nights, setNights] = useState<number>(initialNights);
  const [guests, setGuests] = useState<number>(initialGuests);

  // BUGÜN (yerel gün başlangıcı) – geçmişi kilitlemek için
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  const [checkin, setCheckin] = useState<Date | undefined>(
    initialCheckin ? parseISO(initialCheckin) : undefined,
  );

  // initialCheckin geçmişteyse bugüne çek
  useEffect(() => {
    if (checkin && checkin < today) setCheckin(today);
  }, [checkin, today]);

  // checkout = giriş + nights (çıkış günü DAHİL taralı)
  const checkout = useMemo(
    () =>
      checkin ? addDays(checkin, Math.max(NIGHTS_MIN, Math.min(NIGHTS_MAX, nights))) : undefined,
    [checkin, nights],
  );

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

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (regionOpen && !regionPanelRef.current?.contains(t) && !regionBtnRef.current?.contains(t))
        setRegionOpen(false);
      if (dateOpen && !datePanelRef.current?.contains(t) && !dateBtnRef.current?.contains(t))
        setDateOpen(false);
      if (guestsOpen && !guestsPanelRef.current?.contains(t) && !guestsBtnRef.current?.contains(t))
        setGuestsOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [regionOpen, dateOpen, guestsOpen]);

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

  function makeQS() {
    const params = new URLSearchParams();
    selP.forEach((v) => params.append("province", v));
    selD.forEach((v) => params.append("district", v));
    selN.forEach((v) => params.append("neighborhood", v));
    if (checkin) params.set("checkin", format(checkin, "yyyy-MM-dd"));
    params.set("nights", String(Math.max(NIGHTS_MIN, Math.min(NIGHTS_MAX, nights))));
    params.set("guests", String(Math.max(GUESTS_MIN, Math.min(GUESTS_MAX, guests))));
    return params.toString();
  }

  function handleDayClick(day: Date) {
    setCheckin(day);
  }

  return (
    <div className="w-full mx-auto rounded-xl border bg-white/80 backdrop-blur p-3 md:p-4 shadow-sm">
      {/* 4 kolon: Bölge | Tarih | Kişi | Ara */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Bölge */}
        <div className="relative">
          <Label className="text-xs">Bölge</Label>
          <button
            ref={regionBtnRef}
            type="button"
            className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setRegionOpen((v) => !v);
              setDateOpen(false);
              setGuestsOpen(false);
            }}
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
        </div>

        {/* Tarih */}
        <div className="relative">
          <Label className="text-xs">Tarih</Label>
          <button
            ref={dateBtnRef}
            type="button"
            className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setDateOpen((v) => !v);
              setRegionOpen(false);
              setGuestsOpen(false);
            }}
          >
            <span className="text-sm">
              {checkin
                ? `Giriş: ${format(checkin, "d MMM yyyy", { locale: tr })} · Çıkış: ${
                    checkout ? format(checkout, "d MMM yyyy", { locale: tr }) : "—"
                  }`
                : "Tarih seçiniz"}
            </span>
          </button>
        </div>

        {/* Kişi sayısı */}
        <div className="relative">
          <Label className="text-xs">Kişi Sayısı</Label>
          <button
            ref={guestsBtnRef}
            type="button"
            className="w-full border rounded-md px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              setGuestsOpen((v) => !v);
              setRegionOpen(false);
              setDateOpen(false);
            }}
          >
            <span className="text-sm">{guests} kişi</span>
          </button>
        </div>

        {/* Ara */}
        <div className="flex items-end">
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={() => {
              const qs = makeQS();
              router.push(`/search?${qs}`);
            }}
          >
            Ara
          </Button>
        </div>
      </div>

      {/* REGION PANEL */}
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
            {selP.length + selD.length + selN.length > 0 && (
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

      {/* DATE PANEL – geçmiş günler DISABLED */}
      {dateOpen && (
        <Portal>
          <div
            ref={datePanelRef}
            style={{
              position: "fixed",
              top: datePos.top,
              left: datePos.left,
              width: Math.max(620, datePos.width),
              maxWidth: Math.min(720, window.innerWidth - 24),
            }}
            className="z-[9999] rounded-lg border bg-white p-3 shadow-lg overflow-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-medium text-gray-700">Kaç gece kalacaksınız?</span>
              <select
                value={nights}
                onChange={(e) =>
                  setNights(Math.max(NIGHTS_MIN, Math.min(NIGHTS_MAX, Number(e.target.value))))
                }
                className="border rounded px-3 py-2 text-base"
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
              locale={tr}
              mode="single"
              numberOfMonths={2}
              showOutsideDays
              selected={checkin}
              onDayClick={handleDayClick}
              disabled={{ before: today }} //  ← geçmiş günler kapalı
              modifiers={{
                range: checkin && checkout ? { from: checkin, to: checkout } : undefined,
              }}
              modifiersStyles={{
                range: { backgroundColor: "rgba(251, 146, 60, 0.22)" },
              }}
              className="!text-[12px]"
              styles={{
                months: {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  alignItems: "start",
                },
                month: { margin: 0 },
              }}
              style={
                {
                  ["--rdp-cell-size" as any]: "30px",
                  ["--rdp-caption-font-size" as any]: "14px",
                  ["--rdp-day_button-width" as any]: "30px",
                  ["--rdp-day_button-height" as any]: "30px",
                } as React.CSSProperties
              }
            />

            {/* Hafta günlerini kalınlaştır */}
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

      {/* GUESTS PANEL */}
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
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setGuestsOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
