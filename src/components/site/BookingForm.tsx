// src/components/site/BookingForm.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export default function BookingForm({
  villaName,
  villaImage,
  from,
  to,
  nights,
  total,
  deposit,
}: {
  villaName: string;
  villaImage: string;
  from: Date;
  to: Date;
  nights: number;
  total: number;
  deposit: number;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      message: fd.get("message"),
      startDate: from.toISOString(),
      endDate: to.toISOString(),
    };

    try {
      // Eğer /api/inquiry henüz yoksa, bu fetch başarısız olabilir.
      await fetch("/api/inquiry", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-green-700">
          Talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Form sol */}
      <form onSubmit={onSubmit} className="md:col-span-2 rounded-xl border p-6 space-y-3">
        <h3 className="text-lg font-semibold mb-2">Bilgileriniz</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            name="name"
            className="border rounded-md px-3 py-2"
            placeholder="Adınız Soyadınız"
            required
          />
          <input name="phone" className="border rounded-md px-3 py-2" placeholder="Telefon" />
          <input
            name="email"
            type="email"
            className="border rounded-md px-3 py-2 md:col-span-2"
            placeholder="E-posta"
            required
          />
          <textarea
            name="message"
            className="border rounded-md px-3 py-2 md:col-span-2"
            placeholder="Notlarınız (opsiyonel)"
            rows={4}
          />
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full md:w-auto" disabled={loading}>
            {loading ? "Gönderiliyor..." : "Ön Rezervasyon Talebi Gönder"}
          </Button>
        </div>
      </form>

      {/* Sağ özet paneli */}
      <aside className="rounded-xl border p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-24 overflow-hidden rounded-md">
            <Image src={villaImage} alt={villaName} fill className="object-cover" />
          </div>
          <div>
            <div className="font-semibold">{villaName}</div>
            <div className="text-xs text-gray-500">
              {format(from, "d MMM yyyy", { locale: tr })} →{" "}
              {format(to, "d MMM yyyy", { locale: tr })} · {nights} gece
            </div>
          </div>
        </div>

        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Toplam</span>
            <span>{tl.format(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ön Ödeme</span>
            <span>{tl.format(deposit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kalan Ödeme</span>
            <span>{tl.format(total - deposit)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Not: Şu an siteden doğrudan ödeme alınmıyor; gönderdiğiniz ön talep ekibimize iletilir ve
          tarafınıza dönüş yapılır.
        </p>
      </aside>
    </div>
  );
}
