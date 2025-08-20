"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface BookingFormProps {
  villaId?: string;
  villaName: string;
  villaImage: string;
  from: Date;
  to: Date;
  nights: number;
  total: number;
  deposit: number;
}

export default function BookingForm({
  villaId,
  villaName,
  villaImage,
  from,
  to,
  nights,
  total,
  deposit,
}: BookingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!villaId) {
      alert("Villa bilgisi eksik");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          villa_id: villaId,
          start_date: format(from, "yyyy-MM-dd"),
          end_date: format(to, "yyyy-MM-dd"),
          guest_name: formData.name,
          guest_email: formData.email,
          guest_phone: formData.phone,
          notes: formData.notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Başarılı sayfasına yönlendir
        router.push(`/booking/success?id=${data.reservation.id}`);
      } else {
        alert(data.error || "Rezervasyon oluşturulurken hata oluştu");
      }
    } catch (error) {
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
      console.error("Booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Ad Soyad *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="phone">Telefon *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="05XX XXX XX XX"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">E-posta *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Varsa özel isteklerinizi belirtebilirsiniz..."
          disabled={isSubmitting}
        />
      </div>

      <div className="pt-4 border-t">
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">Ön Ödeme Tutarı:</span>
          <span className="text-xl font-bold">₺{deposit.toLocaleString("tr-TR")}</span>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              İşleniyor...
            </>
          ) : (
            "Rezervasyonu Tamamla"
          )}
        </Button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Rezervasyonunuz onaylandıktan sonra size bilgilendirme e-postası gönderilecektir.
        </p>
      </div>
    </form>
  );
}
