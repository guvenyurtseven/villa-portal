"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, X, Loader2, Home } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { format, addMonths } from "date-fns";
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

  // Disabled dates for calendar
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

  // Tarih bloke et
  async function blockDates() {
    if (!selectedRange?.from || !selectedRange?.to) {
      alert("Lütfen tarih aralığı seçin");
      return;
    }

    setBlocking(true);

    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villa_id: villaId,
          start_date: format(selectedRange.from, "yyyy-MM-dd"),
          end_date: format(selectedRange.to, "yyyy-MM-dd"),
          reason: blockReason === "temizlik" ? "Temizlik" : "Rezervasyon",
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
    } catch (error) {
      alert("Hata oluştu");
    } finally {
      setBlocking(false);
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
              classNames={{
                months: "flex gap-4",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_disabled: "text-muted-foreground opacity-50 bg-gray-100",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
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

      {/* Mevcut Rezervasyonlar */}
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
                        <p className="font-medium">{res.guest_name}</p>
                        <p className="text-sm text-gray-500">{res.guest_email}</p>
                        <p className="text-sm mt-1">
                          {dates.start} - {dates.end}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          ₺{res.total_price?.toLocaleString("tr-TR")}
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

      {/* Bloke Tarihler */}
      <Card>
        <CardHeader>
          <CardTitle>Bloke Tarihler</CardTitle>
        </CardHeader>
        <CardContent>
          {blockedDates.length > 0 ? (
            <div className="space-y-2">
              {blockedDates.map((block) => {
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
                      {block.reason && <p className="text-sm text-gray-500">{block.reason}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeBlock(block.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Bloke edilmiş tarih bulunmuyor.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
