"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import PhotoManager from "@/components/admin/PhotoManager";

type Villa = {
  id: string;
  name: string;
  location: string;
  weekly_price: number;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  has_pool: boolean | null;
  sea_distance: string | null;
  lat: number | null;
  lng: number | null;
  is_hidden: boolean | null;
  priority?: number | null;
};

type Photo = {
  id?: string;
  url: string;
  is_primary: boolean;
  order_index: number;
};

type CategoryOption = { id: string; name: string; slug: string };

export default function VillaEditForm({
  initialVilla,
  initialPhotos,
  categories = [],
  initialCategoryIds = [],
}: {
  initialVilla: Villa;
  initialPhotos: Photo[];
  categories?: CategoryOption[];
  initialCategoryIds?: string[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: initialVilla.name ?? "",
    location: initialVilla.location ?? "",
    weekly_price: Number(initialVilla.weekly_price ?? 0),
    description: initialVilla.description ?? "",
    bedrooms: Number(initialVilla.bedrooms ?? 1),
    bathrooms: Number(initialVilla.bathrooms ?? 1),
    has_pool: Boolean(initialVilla.has_pool ?? false),
    sea_distance: initialVilla.sea_distance ?? "",
    lat: initialVilla.lat ?? 0,
    lng: initialVilla.lng ?? 0,
    is_hidden: Boolean(initialVilla.is_hidden ?? false),
    priority: Number(initialVilla.priority ?? 1),
  });

  const [photos, setPhotos] = useState<Photo[]>(
    (initialPhotos ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((p, i) => ({ ...p, order_index: i })),
  );

  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds ?? []);

  const onChange = (key: keyof typeof form, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photos.length) {
      alert("En az bir fotoğraf ekleyin.");
      return;
    }
    if (!photos.some((p) => p.is_primary)) photos[0].is_primary = true;

    setSaving(true);
    try {
      const priority = Math.min(5, Math.max(1, Number(form.priority) || 1));

      const payload = {
        villa: {
          name: form.name.trim(),
          location: form.location.trim(),
          weekly_price: Number(form.weekly_price),
          description: form.description?.trim() || null,
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          has_pool: !!form.has_pool,
          sea_distance: form.sea_distance?.trim() || null,
          lat: form.lat === null ? null : Number(form.lat),
          lng: form.lng === null ? null : Number(form.lng),
          is_hidden: !!form.is_hidden,
          priority,
        },
        photos: photos.map((p, i) => ({
          id: p.id,
          url: p.url,
          is_primary: !!p.is_primary,
          order_index: i,
        })),
        categoryIds, // 🔴 yeni
      };

      const res = await fetch(`/api/admin/villas/${initialVilla.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Güncelleme başarısız");
      }

      alert("Villa güncellendi.");
      router.push("/admin/villas");
    } catch (e) {
      console.error(e);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Üst: Villa Bilgileri */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Villa Bilgileri</h2>
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Villa Adı</label>
            <Input value={form.name} onChange={(e) => onChange("name", e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Konum</label>
            <Input
              value={form.location}
              onChange={(e) => onChange("location", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Haftalık Fiyat (₺)</label>
            <Input
              type="number"
              min={0}
              value={form.weekly_price}
              onChange={(e) => onChange("weekly_price", e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="has_pool"
              checked={form.has_pool}
              onCheckedChange={(v) => onChange("has_pool", !!v)}
            />
            <label htmlFor="has_pool" className="text-sm">
              Havuz var
            </label>
          </div>

          <div>
            <label className="text-sm font-medium">Yatak Odası</label>
            <Input
              type="number"
              min={0}
              value={form.bedrooms}
              onChange={(e) => onChange("bedrooms", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Banyo</label>
            <Input
              type="number"
              min={0}
              value={form.bathrooms}
              onChange={(e) => onChange("bathrooms", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Denize Mesafe</label>
            <Input
              value={form.sea_distance}
              onChange={(e) => onChange("sea_distance", e.target.value)}
              placeholder="Örn: 500 m"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Latitude</label>
            <Input
              type="number"
              step="0.000001"
              value={form.lat ?? 0}
              onChange={(e) => onChange("lat", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Longitude</label>
            <Input
              type="number"
              step="0.000001"
              value={form.lng ?? 0}
              onChange={(e) => onChange("lng", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_hidden"
              checked={form.is_hidden}
              onCheckedChange={(v) => onChange("is_hidden", !!v)}
            />
            <label htmlFor="is_hidden" className="text-sm">
              Gizli (yayında değil)
            </label>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="priority">
              Öncelik Puanı (1-5)
            </label>
            <Input
              id="priority"
              type="number"
              min={1}
              max={5}
              value={form.priority}
              onChange={(e) => onChange("priority", e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Açıklama</label>
          <Textarea
            rows={6}
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Villa açıklaması..."
          />
        </div>

        {/* Kategoriler */}
        {categories?.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Kategoriler</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map((c) => {
                const checked = categoryIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="inline-flex items-center gap-2 rounded border px-3 py-2 cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="accent-black"
                      checked={checked}
                      onChange={() => toggleCategory(c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Bir villa birden fazla kategoriye dahil olabilir.
            </p>
          </div>
        ) : null}
      </Card>

      {/* Alt: Fotoğraflar */}
      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Fotoğraflar</h2>
        <PhotoManager
          villaId={initialVilla.id}
          initialPhotos={initialPhotos}
          onChange={setPhotos}
        />
        <div className="pt-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
