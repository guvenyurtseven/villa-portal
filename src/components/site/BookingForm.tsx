"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

type Props = {
  villaId: string;
  villaName: string;
  villaImage?: string;
  from: Date; // check-in
  to: Date; // check-out
  nights: number;
  total: number;
  deposit: number;
};

export default function BookingForm(props: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    adults: 2,
    children: 0,
    message: "",
    _hp: "", // honeypot
  });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone) {
      alert("Lütfen ad, e-posta ve telefon alanlarını doldurun.");
      return;
    }

    try {
      setSubmitting(true);

      // API: /api/pre-reservations → e-posta gönder
      const res = await fetch("/api/pre-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villaId: props.villaId,
          villaName: props.villaName,
          startDate: format(props.from, "yyyy-MM-dd"),
          endDate: format(props.to, "yyyy-MM-dd"),
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          adults: Number(form.adults) || undefined,
          children: Number(form.children) || undefined,
          message: form.message || undefined,
          _hp: form._hp, // bot koruması
        }),
      });

      if (!res.ok) {
        let msg = "E-posta gönderilemedi. Lütfen tekrar deneyin.";
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const data = await res.json();
            msg = data?.error || msg;
          } else {
            msg = await res.text();
          }
        } catch {}
        throw new Error(msg);
      }

      alert("Ön rezervasyon talebiniz iletildi. Teşekkürler!");
      // İstersen burada bir yönlendirme yapabilirsin:
      // router.push("/site");
      router.push("/?pre=1");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot - görünmez */}
      <input
        type="text"
        name="_hp"
        autoComplete="off"
        value={form._hp}
        onChange={(e) => setForm((f) => ({ ...f, _hp: e.target.value }))}
        className="hidden"
        tabIndex={-1}
      />

      {/* Mevcut tasarımına uyacak basit alanlar — istersen kendi input bileşenlerinle değiştir */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium">Ad Soyad*</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">E-posta*</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Telefon*</span>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="+90 ..."
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium">Yetişkin</span>
            <input
              type="number"
              min={1}
              value={form.adults}
              onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value || 0) }))}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Çocuk</span>
            <input
              type="number"
              min={0}
              value={form.children}
              onChange={(e) => setForm((f) => ({ ...f, children: Number(e.target.value || 0) }))}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
        </div>
      </div>

      <label className="block">
        <span className="block text-sm font-medium">Not</span>
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="Var ise eklemek istediğiniz notlar..."
        />
      </label>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {submitting ? "Gönderiliyor..." : "Rezervasyonu tamamla"}
        </button>
      </div>
    </form>
  );
}
