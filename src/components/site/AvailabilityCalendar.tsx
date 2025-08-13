"use client";

import { useMemo, useState } from "react";
import { DayPicker, DateRange, Matcher } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  startOfToday,
  parseISO,
  isBefore,
  isAfter,
  isEqual,
  differenceInCalendarDays,
} from "date-fns";
import { tr } from "date-fns/locale";

export type ReservedRange = { start: string; end: string };
export type ValidRange = { from: Date; to: Date; nights: number };

function isInRange(d: Date, from: Date, to: Date) {
  return (isAfter(d, from) || isEqual(d, from)) && (isBefore(d, to) || isEqual(d, to));
}
function overlaps(r1: { from: Date; to: Date }, r2: { from: Date; to: Date }) {
  return r1.from <= r2.to && r1.to >= r2.from;
}

export default function AvailabilityCalendar({
  reservedRanges,
  minNights = 7,
  onValidRange,
  onInvalid,
}: {
  reservedRanges: ReservedRange[];
  minNights?: number;
  onValidRange: (r: ValidRange) => void; // sadece iki tarih seçilip geçerliyse çağrılır
  onInvalid?: (msg: string) => void; // sadece iki tarih seçilip GEÇERSİZSE çağrılır
}) {
  const [selected, setSelected] = useState<DateRange | undefined>(undefined);
  const today = startOfToday();

  // Rezerve günler hem "disabled" hem de "reserved" modifier olarak geçsin
  const reservedMatchers: Matcher[] = useMemo(
    () =>
      reservedRanges.map((r) => ({
        from: parseISO(r.start),
        to: parseISO(r.end),
      })),
    [reservedRanges],
  );

  function isReservedDate(d: Date) {
    return reservedMatchers.some((m) => isInRange(d, (m as any).from, (m as any).to));
  }
  function isPast(d: Date) {
    return isBefore(d, today);
  }

  function handleSelect(r?: DateRange) {
    setSelected(r);
    // henüz iki uç seçilmediyse: HİÇBİR HATA GÖSTERME (kritik düzeltme)
    if (!r?.from || !r?.to) return;

    // dolu günleri kapsıyor mu?
    const coversReserved = reservedMatchers.some((m) =>
      overlaps({ from: r.from, to: r.to }, { from: (m as any).from, to: (m as any).to }),
    );
    if (coversReserved) {
      setSelected(undefined);
      onInvalid?.("Seçtiğiniz aralıkta dolu gün(ler) var. Lütfen farklı bir aralık seçin.");
      return;
    }

    const nights = differenceInCalendarDays(r.to, r.from);
    if (nights < minNights) {
      setSelected(undefined);
      onInvalid?.(`Üzgünüz, bu tarih aralığı için minimum rezervasyon ${minNights} gecedir!`);
      return;
    }

    onValidRange({ from: r.from, to: r.to, nights });
  }

  return (
    <DayPicker
      mode="range"
      locale={tr}
      numberOfMonths={2} /* yan yana iki ay */
      paginatedNavigation
      weekStartsOn={1}
      showOutsideDays
      selected={selected}
      onSelect={handleSelect}
      disabled={[{ before: today }, ...reservedMatchers]}
      /* Renkler için modifiye sınıfları */
      modifiers={{
        reserved: reservedMatchers,
        available: (d) => !isPast(d) && !isReservedDate(d),
      }}
      modifiersClassNames={{
        reserved: "rdp-day_reserved",
        available: "rdp-day_available",
        today: "rdp-day_today",
      }}
      className="booking-calendar"
    />
  );
}
