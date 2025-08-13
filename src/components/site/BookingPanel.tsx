// src/components/site/BookingPanel.tsx
"use client";

import { useMemo, useState } from "react";
import { DayPicker, DateRange, Matcher } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { differenceInCalendarDays, startOfToday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ReservedRange = { start: string; end: string };

export default function BookingPanel({
  villaId,
  weeklyPrice,
  reservedRanges,
}: {
  villaId: string;
  weeklyPrice: number;
  reservedRanges: ReservedRange[];
}) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: özet, 2: form

  const disabled: Matcher[] = useMemo(() => {
    const today = startOfToday();
    const reserved: Matcher[] = reservedRanges.map((r) => ({
      from: parseISO(r.start),
      to: parseISO(r.end),
    }));
    return [{ before: today }, ...reserved];
  }, [reservedRanges]);

  function overlapsReserved(r: DateRange): boolean {
    if (!r.from || !r.to) return false;
    const from = r.from;
    const to = r.to;
    // herhangi bir rezerve aralıkla çakışıyor mu? (kesişim var mı?)
    return reservedRanges.some((blk) => {
      const s = parseISO(blk.start);
      const e = parseISO(blk.end);
      return from <= e && to >= s; // inclusive overlap
    });
  }

  function handleSelect(r?: DateRange) {
    setError(null);
    setSummaryOpen(false);
    setStep(1);
    setRange(r);

    // iki uç seçilmemişse hiçbir kontrol yapma (madde 6)
    if (!r?.from || !r?.to) return;

    // dolu gün içeren aralığı reddet (madde 3)
    if (overlapsReserved(r)) {
      setRange(undefined);
      setError("Seçtiğiniz tarihler arasında dolu gün(ler) var. Lütfen farklı bir aralık seçin.");
      return;
    }

    // min 7 gece kontrolü (madde 6)
    const nights = differenceInCalendarDays(r.to, r.from);
    if (nights < 7) {
      setRange(undefined);
      setError("Üzgünüz, bu tarih aralığı için minimum rezervasyon 7 gecedir!");
      return;
    }

    // Uygunsa özet modali aç
    setSummaryOpen(true);
  }

  const nights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;

  // Ücret hesabı: haftalık fiyat * tavan(night/7)  (haftalık kiralama mantığı)
  const weeks = nights > 0 ? Math.ceil(nights / 7) : 0;
  const total = weeks * weeklyPrice;
  const deposit = Math.round(total * 0.35);
  const remaining = total - deposit;

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-3">Müsaitlik & Fiyat</h3>

      {/* Takvim (madde 1,2,4) */}
      <div className="rounded-xl border border-gray-200 p-3 bg-white">
        <DayPicker
          mode="range"
          locale={tr}
          numberOfMonths={2}
          paginatedNavigation
          disabled={disabled}
          selected={range}
          onSelect={handleSelect}
          weekStartsOn={1}
          showOutsideDays
          className="booking-calendar"
        />
        {/* Lejand */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm border border-gray-300 bg-white"></span> Müsait
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-gray-200 border border-gray-300"></span> Dolu /
            Geçmiş
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-black"></span> Seçili
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
        )}
      </div>

      {/* Özet / Form Modal (madde 6 devam) */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-[640px]">
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>Tarihler Müsait</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Giriş</div>
                    <div className="font-medium">{range?.from?.toLocaleDateString("tr-TR")}</div>
                  </div>
                  <div className="text-2xl">→</div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Çıkış</div>
                    <div className="font-medium">{range?.to?.toLocaleDateString("tr-TR")}</div>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-gray-50">
                  <div className="flex justify-between">
                    <span>Toplam gece</span>
                    <strong>{nights}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hesaplanan hafta</span>
                    <strong>{weeks}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Haftalık fiyat</span>
                    <strong>₺{weeklyPrice.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplam</span>
                    <strong>₺{total.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ön ödeme (≈%35)</span>
                    <strong>₺{deposit.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Kalan ödeme</span>
                    <strong>₺{remaining.toLocaleString("tr-TR")}</strong>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSummaryOpen(false)}>
                    Kapat
                  </Button>
                  <Button onClick={() => setStep(2)}>Devam</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Ön Rezervasyon Formu</DialogTitle>
              </DialogHeader>
              <BookingForm
                villaId={villaId}
                from={range?.from!}
                to={range?.to!}
                total={total}
                onDone={() => {
                  setSummaryOpen(false);
                  setStep(1);
                  setRange(undefined);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Basit ön talep formu */
function BookingForm({
  villaId,
  from,
  to,
  total,
  onDone,
}: {
  villaId: string;
  from: Date;
  to: Date;
  total: number;
  onDone: () => void;
}) {
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    // Eğer /api/inquiry rotan daha önce eklendiyse direkt oraya yazabiliriz:
    await fetch("/api/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        villaId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: payload.message,
        startDate: from.toISOString(),
        endDate: to.toISOString(),
        source: "web",
      }),
    });

    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input name="name" placeholder="Adınız Soyadınız" required />
        <Input name="email" type="email" placeholder="E-posta" required />
        <Input name="phone" placeholder="Telefon" />
        <div className="rounded-md border p-2 bg-gray-50 text-sm">
          <div className="flex justify-between">
            <span>Giriş</span>
            <strong>{from.toLocaleDateString("tr-TR")}</strong>
          </div>
          <div className="flex justify-between">
            <span>Çıkış</span>
            <strong>{to.toLocaleDateString("tr-TR")}</strong>
          </div>
          <div className="flex justify-between">
            <span>Toplam</span>
            <strong>₺{total.toLocaleString("tr-TR")}</strong>
          </div>
        </div>
      </div>
      <Textarea name="message" placeholder="Notlarınız (opsiyonel)" />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Vazgeç
        </Button>
        <Button type="submit">Talebi Gönder</Button>
      </div>
    </form>
  );
}
