"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function BookingForm({
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
    await fetch("/api/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        villaId,
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        message: fd.get("message"),
        startDate: from.toISOString(),
        endDate: to.toISOString(),
        source: "web",
      }),
    });
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input name="name" placeholder="Adınız Soyadınız" required />
      <Input type="email" name="email" placeholder="E-posta" required />
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
      <div className="sm:col-span-2">
        <Textarea name="message" placeholder="Notlarınız (opsiyonel)" />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Vazgeç
        </Button>
        <Button type="submit">Talebi Gönder</Button>
      </div>
    </form>
  );
}
