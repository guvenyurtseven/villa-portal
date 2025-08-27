"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, X, Loader2, Home, DollarSign } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { format, startOfDay, addDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import Image from "next/image";
import { useParams } from "next/navigation";

const RANGE_RE = /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})[\)\]]$/;

// Her ihtimale karşı JSON'u diziye çevirir
function toArray<T = any>(x: any): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x && Array.isArray(x.data)) return x.data as T[];
  if (x && Array.isArray(x.items)) return x.items as T[];
  return [];
}

interface Villa {
  id: string;
  name: string;
  photos?: any[];
}

interface Reservation {
  id: string;
  date_range: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  status: string;
  total_price: number;
}

interface BlockedDate {
  id: string;
  date_range: string;
  reason: string;
}

interface PricingPeriod {
  id: string;
  start_date: string;
  end_date: string;
  nightly_price: number;
}

type DiscountPeriod = {
  id: string;
  villa_id: string;
  start_date: string;
  end_date: string;
  nightly_price: number;
  priority: number;
};

export default function VillaCalendarPage() {
  const routeParams = useParams<{ id: string }>();
  const villaIdFromRoute = String(routeParams?.id || "");

  const [villaId, setVillaId] = useState<string>("");
  const [villa, setVilla] = useState<Villa | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [pricingPeriods, setPricingPeriods] = useState<PricingPeriod[]>([]);
  const [discountPeriods, setDiscountPeriods] = useState<DiscountPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);
  const router = useRouter();

  // Takvim state
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [blockReason, setBlockReason] = useState<"rezervasyon" | "temizlik">("rezervasyon");

  // Müşteri bilgileri state'leri
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Fiyat dönemi state'leri
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [pricingRange, setPricingRange] = useState<DateRange | undefined>();
  const [nightlyPrice, setNightlyPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  // İndirim dönemi state'leri
  const [newDiscountRange, setNewDiscountRange] = useState<DateRange | undefined>();
  const [newDiscountPrice, setNewDiscountPrice] = useState<string>("");
  const [newDiscountPriority, setNewDiscountPriority] = useState<number>(5);
  const [savingDiscount, setSavingDiscount] = useState(false);

  // İlk yükleme: route paramından villaId al ve verileri çek
  useEffect(() => {
    if (!villaIdFromRoute) return;
    setVillaId(villaIdFromRoute);
    fetchData(villaIdFromRoute);
  }, [villaIdFromRoute]);

  async function fetchData(id: string) {
    try {
      // Villa bilgilerini al
      const villaRes = await fetch(`/api/admin/villas/${id}`);
      if (!villaRes.ok) {
        const publicRes = await fetch(`/api/villas/${id}`);
        const villaData = await publicRes.json();
        setVilla(villaData);
      } else {
        const villaData = await villaRes.json();
        setVilla(villaData);
      }

      // Rezervasyonları al
      const resRes = await fetch(`/api/reservations?villa_id=${id}`);
      setReservations(toArray<Reservation>(await resRes.json()));

      // Bloke tarihleri al
      const blockRes = await fetch(`/api/admin/blocked-dates?villa_id=${id}`);
      setBlockedDates(toArray<BlockedDate>(await blockRes.json()));

      // Fiyat dönemlerini al
      const pricingRes = await fetch(`/api/admin/pricing-periods?villa_id=${id}`);
      setPricingPeriods(toArray<PricingPeriod>(await pricingRes.json()));

      // İndirim dönemlerini al
      const discountRes = await fetch(`/api/admin/discount-periods?villa_id=${id}`, {
        cache: "no-store",
      });
      if (discountRes.ok) {
        const json = await discountRes.json();
        setDiscountPeriods(
          (json.periods || []).sort((a: DiscountPeriod, b: DiscountPeriod) =>
            a.start_date.localeCompare(b.start_date),
          ),
        );
      } else {
        console.error("discount-periods GET failed:", discountRes.status);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Tarih aralığını parse et
  function parseDateRange(dateRange: string): { start: string; end: string } {
    const m = RANGE_RE.exec(String(dateRange ?? ""));
    return m ? { start: m[1], end: m[2] } : { start: "", end: "" };
  }

  // Check-in günleri - useMemo'yu her zaman çağır
  const checkInDays = useMemo(() => {
    const days: Date[] = [];

    // confirmed rezervasyon başlangıçları
    reservations
      .filter((r) => r.status === "confirmed")
      .forEach((r) => {
        const m = RANGE_RE.exec(r.date_range ?? "");
        if (!m) return;
        days.push(startOfDay(parseISO(m[1])));
      });

    // TÜM blokelerin başlangıçları (temizlik dahil)
    blockedDates.forEach((b) => {
      const m = RANGE_RE.exec(b.date_range ?? "");
      if (!m) return;
      days.push(startOfDay(parseISO(m[1])));
    });

    return Array.from(new Map(days.map((d) => [d.toISOString(), d])).values()).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
  }, [reservations, blockedDates]);

  // Check-out günleri - useMemo'yu her zaman çağır
  const checkOutDays = useMemo(() => {
    const days: Date[] = [];

    // confirmed rezervasyon bitişleri
    reservations
      .filter((r) => r.status === "confirmed")
      .forEach((r) => {
        const m = RANGE_RE.exec(r.date_range ?? "");
        if (!m) return;
        days.push(startOfDay(parseISO(m[2])));
      });

    // TÜM blokelerin bitişleri (temizlik dahil)
    blockedDates.forEach((b) => {
      const m = RANGE_RE.exec(b.date_range ?? "");
      if (!m) return;
      days.push(startOfDay(parseISO(m[2])));
    });

    return Array.from(new Map(days.map((d) => [d.toISOString(), d])).values()).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
  }, [reservations, blockedDates]);

  const turnoverDays = useMemo(() => {
    const inSet = new Set(checkInDays.map((d) => d.getTime()));
    const outSet = new Set(checkOutDays.map((d) => d.getTime()));
    const both: Date[] = [];
    inSet.forEach((t) => {
      if (outSet.has(t)) both.push(new Date(t));
    });
    return both;
  }, [checkInDays, checkOutDays]);

  // Tamamen dolu günler - useMemo'yu her zaman çağır
  const fullyBookedDays = useMemo(() => {
    const days: Date[] = [];

    // Rezervasyonların iç günleri
    reservations
      .filter((r) => r.status === "confirmed")
      .forEach((r) => {
        const m = RANGE_RE.exec(r.date_range ?? "");
        if (!m) return;
        const start = startOfDay(parseISO(m[1]));
        const end = startOfDay(parseISO(m[2]));
        let cur = addDays(start, 1);
        while (cur < end) {
          days.push(cur);
          cur = addDays(cur, 1);
        }
      });

    // Blokelerin iç günleri (TEMİZLİK dahil) — KENARLAR HARİÇ
    blockedDates.forEach((b) => {
      const m = RANGE_RE.exec(b.date_range ?? "");
      if (!m) return;
      const start = startOfDay(parseISO(m[1]));
      const end = startOfDay(parseISO(m[2]));
      let cur = addDays(start, 1);
      while (cur < end) {
        days.push(cur);
        cur = addDays(cur, 1);
      }
    });

    return Array.from(new Map(days.map((d) => [d.toISOString(), d])).values()).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
  }, [reservations, blockedDates]);

  // Disabled dates - useMemo'yu her zaman çağır
  const disabledDates = useMemo(() => {
    const today = startOfDay(new Date());
    return [{ before: today }, ...fullyBookedDays, ...turnoverDays];
  }, [fullyBookedDays, turnoverDays]);

  // Fiyat dönemleri için modifiers - useMemo'yu her zaman çağır
  const pricingModifiers = useMemo(() => {
    const modifiers: { [key: string]: Date[] } = {};

    pricingPeriods.forEach((period, index) => {
      const days: Date[] = [];
      const start = parseISO(period.start_date);
      const end = parseISO(period.end_date);

      let current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }

      modifiers[`pricing_${index}`] = days;
    });

    return modifiers;
  }, [pricingPeriods]);

  // Fiyat dönemleri için stiller - useMemo'yu her zaman çağır
  const pricingStyles = useMemo(() => {
    const styles: { [key: string]: React.CSSProperties } = {};
    pricingPeriods.forEach((_, index) => {
      styles[`pricing_${index}`] = {
        position: "relative",
        boxShadow: "inset 0 -4px #f9a8d4",
      };
    });
    return styles;
  }, [pricingPeriods]);

  // İndirim dönemleri modifiers / styles
  const discountModifiers = useMemo(() => {
    const modifiers: { [key: string]: Date[] } = {};
    discountPeriods.forEach((period, index) => {
      const days: Date[] = [];
      const start = parseISO(period.start_date);
      const end = parseISO(period.end_date);
      let current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }
      modifiers[`discount_${index}`] = days;
    });
    return modifiers;
  }, [discountPeriods]);

  const discountStyles = useMemo(() => {
    const styles: { [key: string]: React.CSSProperties } = {};
    discountPeriods.forEach((_, index) => {
      styles[`discount_${index}`] = {
        position: "relative",
        boxShadow: "inset 0 -4px #ef4444", // kırmızı alt çizgi
      };
    });
    return styles;
  }, [discountPeriods]);

  // Fiyat dönemi kaydet
  async function savePricingPeriod() {
    if (!pricingRange?.from || !pricingRange?.to || !nightlyPrice) {
      alert("Lütfen tarih aralığı ve fiyat girin");
      return;
    }

    setSavingPrice(true);

    try {
      const res = await fetch("/api/admin/pricing-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villa_id: villaId,
          start_date: format(pricingRange.from, "yyyy-MM-dd"),
          end_date: format(pricingRange.to, "yyyy-MM-dd"),
          nightly_price: parseFloat(nightlyPrice),
        }),
      });

      if (res.ok) {
        setPricingRange(undefined);
        setNightlyPrice("");
        setShowPricingForm(false);
        fetchData(villaId);
        alert("Fiyat dönemi başarıyla eklendi");
      } else {
        const error = await res.json();
        alert(error.error || "Hata oluştu");
      }
    } catch (error) {
      alert("Hata oluştu");
    } finally {
      setSavingPrice(false);
    }
  }

  // Fiyat dönemi sil
  async function removePricingPeriod(periodId: string) {
    if (!confirm("Bu fiyat dönemini silmek istediğinizden emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/pricing-periods?id=${periodId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData(villaId);
        alert("Fiyat dönemi silindi");
      }
    } catch (error) {
      alert("Hata oluştu");
    }
  }

  // İndirim dönemi ekle
  async function addDiscountPeriod(villaId: string) {
    if (!newDiscountRange?.from || !newDiscountRange?.to) return;
    if (!newDiscountPrice) return;
    if (!villaId) {
      alert("Villa ID okunamadı.");
      return;
    }

    setSavingDiscount(true);
    try {
      const body = {
        villa_id: villaId,
        start_date: newDiscountRange.from.toISOString().slice(0, 10),
        end_date: newDiscountRange.to.toISOString().slice(0, 10),
        nightly_price: Number(newDiscountPrice),
        priority: Number(newDiscountPriority) || 5,
      };
      const res = await fetch("/api/admin/discount-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const { period } = await res.json();
        setDiscountPeriods((prev) =>
          [...prev, period].sort((a, b) => a.start_date.localeCompare(b.start_date)),
        );
        // formu sıfırla
        setNewDiscountRange(undefined);
        setNewDiscountPrice("");
        setNewDiscountPriority(5);
      } else if (res.status === 409) {
        alert("Seçilen tarih, mevcut bir indirim dönemiyle çakışıyor.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Kayıt başarısız");
      }
    } finally {
      setSavingDiscount(false);
    }
  }

  async function removeDiscountPeriod(id: string) {
    const res = await fetch(`/api/admin/discount-periods?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setDiscountPeriods((prev) => prev.filter((p) => p.id !== id));
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Silme başarısız");
    }
  }

  // Tarih bloke et
  async function blockDates() {
    if (!selectedRange?.from || !selectedRange?.to) {
      alert("Lütfen tarih aralığı seçin");
      return;
    }

    if (blockReason === "rezervasyon") {
      if (!customerName || !customerPhone) {
        alert("Rezervasyon için müşteri adı ve telefonu zorunludur");
        return;
      }
    }

    setBlocking(true);

    try {
      if (blockReason === "rezervasyon") {
        const resResponse = await fetch("/api/admin/manual-reservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            villa_id: villaId,
            start_date: format(selectedRange.from, "yyyy-MM-dd"),
            end_date: format(selectedRange.to, "yyyy-MM-dd"),
            guest_name: customerName,
            guest_phone: customerPhone,
            guest_email: customerEmail || "",
            status: "confirmed",
            notes: "Admin tarafından oluşturuldu",
          }),
        });

        if (resResponse.ok) {
          setSelectedRange(undefined);
          setCustomerName("");
          setCustomerPhone("");
          setCustomerEmail("");
          fetchData(villaId);
          alert("Rezervasyon başarıyla oluşturuldu");
        } else {
          const error = await resResponse.json();
          alert(error.error || "Hata oluştu");
        }
      } else {
        const res = await fetch("/api/admin/blocked-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            villa_id: villaId,
            start_date: format(selectedRange.from, "yyyy-MM-dd"),
            end_date: format(selectedRange.to, "yyyy-MM-dd"),
            reason: "Temizlik",
          }),
        });

        if (res.ok) {
          setSelectedRange(undefined);
          fetchData(villaId);
          alert("Tarihler bloke edildi");
        } else {
          const error = await res.json();
          alert(error.error || "Hata oluştu");
        }
      }
    } catch (error) {
      alert("Hata oluştu");
    } finally {
      setBlocking(false);
    }
  }

  // Rezervasyon durumunu güncelle
  async function updateReservationStatus(reservationId: string, status: string) {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchData(villaId);
        alert(`Rezervasyon ${status === "confirmed" ? "onaylandı" : "iptal edildi"}`);
      }
    } catch (error) {
      alert("Hata oluştu");
    }
  }

  // Bloke kaldır
  async function removeBlock(blockId: string) {
    if (!confirm("Bu blokajı kaldırmak istediğinizden emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/blocked-dates?id=${blockId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData(villaId);
        alert("Blokaj kaldırıldı");
      }
    } catch (error) {
      alert("Hata oluştu");
    }
  }

  // Loading durumunda boş render
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const primaryPhoto =
    villa?.photos?.find((p: any) => p.is_primary)?.url ||
    villa?.photos?.[0]?.url ||
    "/placeholder.jpg";

  return (
    <div className="space-y-6">
      {/* Villa Bilgileri Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Image
              src={primaryPhoto ?? "/placeholder.jpg"}
              alt={villa?.name ?? "Villa"}
              width={128}
              height={128}
              className="w-32 h-32 object-cover rounded-lg"
            />

            <div className="flex-1">
              <h1 className="text-2xl font-bold">{villa?.name}</h1>
              <p className="text-sm text-gray-600 mt-1">Fiyat dönemleri aşağıdan tanımlanabilir</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/admin/villas")}>
              <Home className="mr-2 h-4 w-4" />
              Villalar Listesi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Özel Fiyat Dönemleri */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Özel Fiyat Dönemleri
            </CardTitle>
            <Button
              onClick={() => setShowPricingForm(!showPricingForm)}
              variant="outline"
              size="sm"
            >
              {showPricingForm ? "İptal" : "Yeni Dönem Ekle"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showPricingForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
              <div className="border rounded-lg p-4 bg-white">
                <Label className="mb-2 block">Tarih Aralığı Seçin</Label>
                <DayPicker
                  mode="range"
                  selected={pricingRange}
                  onSelect={setPricingRange}
                  disabled={{ before: new Date() }}
                  numberOfMonths={2}
                  locale={tr}
                />
              </div>

              {pricingRange?.from && pricingRange?.to && (
                <>
                  <div>
                    <Label htmlFor="nightlyPrice">Gecelik Fiyat (₺)</Label>
                    <Input
                      id="nightlyPrice"
                      type="number"
                      value={nightlyPrice}
                      onChange={(e) => setNightlyPrice(e.target.value)}
                      placeholder="Örn: 6800"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Seçilen dönem: {format(pricingRange.from, "dd MMM yyyy", { locale: tr })} -
                      {format(pricingRange.to, "dd MMM yyyy", { locale: tr })}
                    </p>
                  </div>

                  <Button
                    onClick={savePricingPeriod}
                    disabled={savingPrice || !nightlyPrice}
                    className="w-full"
                  >
                    {savingPrice ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      "Fiyat Dönemini Kaydet"
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {pricingPeriods.length > 0 ? (
            <div className="space-y-2">
              {pricingPeriods.map((period) => (
                <div
                  key={period.id}
                  className="flex justify-between items-center border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">
                      {period.start_date} - {period.end_date}
                    </p>
                    <p className="text-sm text-gray-600">
                      ₺{period.nightly_price.toLocaleString("tr-TR")} / gece
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removePricingPeriod(period.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Henüz fiyat dönemi tanımlanmamış</p>
              <p className="text-sm mt-1">
                Rezervasyon alabilmek için en az bir fiyat dönemi tanımlamalısınız
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* İndirim Dönemleri */}
      <div className="mt-6 rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3">İndirim Dönemleri</h3>

        {/* Liste */}
        <div className="space-y-2 mb-4">
          {discountPeriods.length === 0 && (
            <div className="text-sm text-gray-500">Kayıtlı indirim dönemi yok.</div>
          )}
          {discountPeriods.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium text-sm">
                  {p.start_date} – {p.end_date}
                </div>
                <div className="text-xs text-gray-600">
                  ₺{p.nightly_price.toLocaleString("tr-TR")}/gece · Öncelik: {p.priority}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeDiscountPeriod(p.id)}>
                Sil
              </Button>
            </div>
          ))}
        </div>

        {/* Ekleme formu */}
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Tarih Aralığı</Label>
            <div className="rounded-md border p-2">
              <DayPicker
                mode="range"
                numberOfMonths={2}
                selected={newDiscountRange as DateRange}
                onSelect={setNewDiscountRange}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">İndirimli Fiyat (₺/gece)</Label>
              <Input
                type="number"
                min={1}
                value={newDiscountPrice}
                onChange={(e) => setNewDiscountPrice(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <Label className="text-xs">Öncelik (1–10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={newDiscountPriority}
                onChange={(e) => setNewDiscountPriority(Number(e.target.value))}
                placeholder="5"
              />
            </div>
            <Button onClick={() => addDiscountPeriod(villaId)} disabled={!villaId}>
              İndirim Dönemi Ekle
            </Button>
          </div>
        </div>
      </div>

      {/* Takvim ve Bloke Etme */}
      <Card>
        <CardHeader>
          <CardTitle>Tarih Bloke Et</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Takvim Açıklaması */}
          <div className="bg-blue-50 p-4 rounded-lg text-sm">
            <p className="font-medium mb-2">📌 Takvim Kullanımı:</p>
            <ul className="space-y-1 text-gray-700">
              <li>
                • Check-in ve check-out günleri seçilebilir (aynı gün hem bitiş hem başlangıç
                olabilir)
              </li>
              <li>• Rezervasyonlar arası geçiş günlerinde temizlik yapılır</li>
            </ul>
          </div>

          {/* Takvim */}
          <div className="border rounded-lg p-4">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={setSelectedRange}
              disabled={disabledDates}
              numberOfMonths={2}
              locale={tr}
              modifiers={{
                checkIn: checkInDays,
                checkOut: checkOutDays,
                turnover: turnoverDays,
                fullyBooked: fullyBookedDays,
                ...pricingModifiers,
                ...discountModifiers,
              }}
              modifiersStyles={{
                turnover: {
                  background:
                    "linear-gradient(135deg, transparent 44%, white 44%, white 56%, transparent 56%), #fb923c",
                  color: "black",
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                  pointerEvents: "none",
                  cursor: "not-allowed",
                },
                checkOut: {
                  background: "linear-gradient(135deg, #fb923c 50%, white 50%)",
                  color: "black",
                },
                checkIn: {
                  background: "linear-gradient(135deg, white 50%, #fb923c 50%)",
                  color: "black",
                },
                fullyBooked: {
                  backgroundColor: "#fb923c",
                  color: "white",
                  textDecoration: "line-through",
                },
                ...pricingStyles,
                ...discountStyles,
              }}
              className="!text-sm"
            />
          </div>

          {/* Lejant */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-5 rounded border bg-white" />
              <span>Müsait</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-5 rounded border"
                style={{ background: "linear-gradient(135deg, #fb923c 50%, white 50%)" }}
              />
              <span>Check-out günü</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-5 rounded border"
                style={{ background: "linear-gradient(135deg, white 50%, #fb923c 50%)" }}
              />
              <span>Check-in günü</span>
            </div>
            {/* Turnover */}
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-5 rounded border"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 44%, white 44%, white 56%, transparent 56%), #fb923c",
                }}
              />
              <span>Devir günü</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-5 rounded bg-orange-500" />
              <span>Dolu</span>
            </div>
            {pricingPeriods.length > 0 && (
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-5 rounded border bg-white"
                  style={{ boxShadow: "inset 0 -4px #f9a8d4" }}
                />
                <span>Fiyat Tanımlı</span>
              </div>
            )}
            {discountPeriods.length > 0 && (
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-5 rounded border bg-white"
                  style={{ boxShadow: "inset 0 -4px #ef4444" }}
                />
                <span>İndirimli Dönem</span>
              </div>
            )}
          </div>

          {/* Seçilen Tarihler */}
          {selectedRange?.from && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Seçilen Tarihler:</p>
              <p className="text-sm">
                {format(selectedRange.from, "dd MMMM yyyy", { locale: tr })}
                {selectedRange.to &&
                  ` - ${format(selectedRange.to, "dd MMMM yyyy", { locale: tr })}`}
              </p>
            </div>
          )}

          {/* Bloke Tipi Seçimi */}
          <div className="space-y-3">
            <Label>Bloke Tipi</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="blockType"
                  value="rezervasyon"
                  checked={blockReason === "rezervasyon"}
                  onChange={() => setBlockReason("rezervasyon")}
                  className="w-4 h-4"
                />
                <span>Rezervasyon</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="blockType"
                  value="temizlik"
                  checked={blockReason === "temizlik"}
                  onChange={() => setBlockReason("temizlik")}
                  className="w-4 h-4"
                />
                <span>Temizlik</span>
              </label>
            </div>
          </div>

          {/* Müşteri Bilgileri Formu */}
          {blockReason === "rezervasyon" && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Müşteri Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerName">
                    Ad Soyad <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">
                    Telefon <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Örn: 0555 123 45 67"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customerEmail">
                    E-posta <span className="text-gray-400">(Opsiyonel)</span>
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Örn: musteri@email.com"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kaydet Butonu */}
          <Button
            onClick={blockDates}
            disabled={blocking || !selectedRange?.from}
            className="w-full"
          >
            {blocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Tarihleri Bloke Et
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Rezervasyonlar */}
      <Card>
        <CardHeader>
          <CardTitle>Rezervasyonlar</CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length > 0 ? (
            <div className="space-y-4">
              {reservations.map((res) => {
                const dates = parseDateRange(res.date_range);
                return (
                  <div key={res.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-lg">{res.guest_name}</p>
                        <p className="text-sm text-gray-600">📞 {res.guest_phone}</p>
                        {res.guest_email && (
                          <p className="text-sm text-gray-600">✉️ {res.guest_email}</p>
                        )}
                        <p className="text-sm mt-2">
                          📅 {dates.start} - {dates.end}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          💰 ₺{res.total_price?.toLocaleString("tr-TR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            res.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : res.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {res.status === "confirmed"
                            ? "Onaylı"
                            : res.status === "cancelled"
                              ? "İptal"
                              : "Bekliyor"}
                        </span>
                        {res.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReservationStatus(res.id, "confirmed")}
                            >
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateReservationStatus(res.id, "cancelled")}
                            >
                              İptal
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Henüz rezervasyon bulunmuyor.</p>
          )}
        </CardContent>
      </Card>

      {/* Temizlik/Bakım Tarihleri */}
      <Card>
        <CardHeader>
          <CardTitle>Temizlik/Bakım Tarihleri</CardTitle>
        </CardHeader>
        <CardContent>
          {blockedDates.filter((b) => b.reason !== "Rezervasyon").length > 0 ? (
            <div className="space-y-2">
              {blockedDates
                .filter((b) => b.reason !== "Rezervasyon")
                .map((block) => {
                  const dates = parseDateRange(block.date_range);
                  return (
                    <div
                      key={block.id}
                      className="flex justify-between items-center border rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {dates.start} - {dates.end}
                        </p>
                        <p className="text-sm text-gray-500">{block.reason || "Temizlik"}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeBlock(block.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-gray-500">Temizlik/bakım için bloke edilmiş tarih bulunmuyor.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
