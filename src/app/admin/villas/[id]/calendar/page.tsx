"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, X, Loader2, Home } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/dist/style.css";

interface Villa {
  id: string;
  name: string;
  location: string;
  weekly_price: number;
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

export default function VillaCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const [villaId, setVillaId] = useState<string>("");
  const [villa, setVilla] = useState<Villa | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
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

  const [disabledDates, setDisabledDates] = useState<Date[]>([]);

  useEffect(() => {
    async function init() {
      const { id } = await params;
      setVillaId(id);
      fetchData(id);
    }
    init();
  }, [params]);

  async function fetchData(id: string) {
    try {
      // Villa bilgilerini al
      const villaRes = await fetch(`/api/villas/${id}`);
      const villaData = await villaRes.json();
      setVilla(villaData);

      // Rezervasyonları al
      const resRes = await fetch(`/api/reservations?villa_id=${id}`);
      const resData = await resRes.json();
      setReservations(resData || []);

      // Bloke tarihleri al
      const blockRes = await fetch(`/api/admin/blocked-dates?villa_id=${id}`);
      const blockData = await blockRes.json();
      setBlockedDates(blockData || []);

      // Disabled dates hesapla
      const disabled: Date[] = [];

      // Rezervasyonları ekle
      resData?.forEach((res: Reservation) => {
        if (res.status !== "cancelled") {
          const dates = parseDateRange(res.date_range);
          const start = new Date(dates.start);
          const end = new Date(dates.end);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            disabled.push(new Date(d));
          }
        }
      });

      // Bloke tarihleri ekle
      blockData?.forEach((block: BlockedDate) => {
        const dates = parseDateRange(block.date_range);
        const start = new Date(dates.start);
        const end = new Date(dates.end);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          disabled.push(new Date(d));
        }
      });

      setDisabledDates(disabled);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Tarih aralığını parse et
  function parseDateRange(dateRange: string): { start: string; end: string } {
    const match = dateRange.match(/\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)/);
    if (match) {
      return { start: match[1], end: match[2] };
    }
    return { start: "", end: "" };
  }

  // TARİH BLOKE ET FONKSİYONU - ÖNEMLİ!
  async function blockDates() {
    if (!selectedRange?.from || !selectedRange?.to) {
      alert("Lütfen tarih aralığı seçin");
      return;
    }

    // Rezervasyon için müşteri bilgisi kontrolü
    if (blockReason === "rezervasyon") {
      if (!customerName || !customerPhone) {
        alert("Rezervasyon için müşteri adı ve telefonu zorunludur");
        return;
      }
    }

    setBlocking(true);

    try {
      // Eğer rezervasyon ise
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
        // Temizlik için normal bloke
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Villa'nın birincil fotoğrafını bul
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
            <img
              src={primaryPhoto}
              alt={villa?.name}
              className="w-32 h-32 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{villa?.name}</h1>
              <p className="text-gray-500 mt-1">{villa?.location}</p>
              <p className="text-lg font-semibold mt-2">
                ₺{villa?.weekly_price?.toLocaleString("tr-TR")} / hafta
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/admin/villas")}>
              <Home className="mr-2 h-4 w-4" />
              Villalar Listesi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Takvim ve Bloke Etme */}
      <Card>
        <CardHeader>
          <CardTitle>Tarih Bloke Et</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Takvim */}
          <div className="border rounded-lg p-4">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={setSelectedRange}
              disabled={[...disabledDates, { before: new Date() }]}
              numberOfMonths={2}
              locale={tr}
            />
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
