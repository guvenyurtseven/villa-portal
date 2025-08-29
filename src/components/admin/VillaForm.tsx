"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import PhotoManager from "@/components/admin/PhotoManager";
import LocationSelect from "@/components/admin/LocationSelect";
type Photo = { id?: string; url: string; is_primary: boolean; order_index: number };
type CategoryOption = { id: string; name: string; slug: string };

// Özellik tanımları (boolean kolon adları + görünen etiket)
const FEATURE_DEFS = [
  { key: "heated_pool", label: "Isıtmalı Havuz" },
  { key: "sheltered_pool", label: "Korunaklı havuz" },
  { key: "tv_satellite", label: "TV - Uydu" },
  { key: "master_bathroom", label: "Ebeveyn Banyosu" },
  { key: "jacuzzi", label: "Jakuzi" },
  { key: "fireplace", label: "Şömine" },
  { key: "children_pool", label: "Çocuk Havuzu" },
  { key: "in_site", label: "Site İçinde" },
  { key: "private_pool", label: "Özel Havuzlu" },
  { key: "playground", label: "Oyun Alanı" },
  { key: "internet", label: "İnternet Bağlantısı" },
  { key: "security", label: "Güvenlik" },
  { key: "sauna", label: "Sauna" },
  { key: "hammam", label: "Hamam" },
  { key: "indoor_pool", label: "Kapalı Havuz" },
  { key: "baby_bed", label: "Bebek Yatağı" },
  { key: "high_chair", label: "Mama Sandalyesi" },
  { key: "foosball", label: "Langırt" },
  { key: "table_tennis", label: "Masa Tenisi" },
  { key: "underfloor_heating", label: "Yerden Isıtma" },
  { key: "generator", label: "Jeneratör" },
  { key: "billiards", label: "Bilardo" },
  { key: "pet_friendly", label: "Evcil Hayvan İzinli" },
] as const;

type FeatureKey = (typeof FEATURE_DEFS)[number]["key"];

export default function VillaForm({ categories = [] }: { categories?: CategoryOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    bedrooms: "1",
    bathrooms: "1",
    has_pool: false,
    sea_distance: "",
    lat: "",
    lng: "",
    is_hidden: false,
    priority: "1",
    cleaning_fee: "",
    capacity: "4",
    province: "",
    district: "",
    neighborhood: "",
  });

  // Özellikler state (hepsi false)
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(
    Object.fromEntries(FEATURE_DEFS.map((f) => [f.key, false])) as Record<FeatureKey, boolean>,
  );

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const onChange = (key: keyof typeof form, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleFeature = (key: FeatureKey, next: boolean) =>
    setFeatures((prev) => ({ ...prev, [key]: next }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photos.length) {
      alert("En az bir fotoğraf ekleyin.");
      return;
    }

    setSaving(true);
    try {
      const priority = Math.min(5, Math.max(1, parseInt(form.priority || "1", 10)));

      const payload = {
        villa: {
          name: form.name.trim(),
          description: form.description?.trim() || null,
          bedrooms: parseInt(form.bedrooms || "0", 10),
          bathrooms: parseInt(form.bathrooms || "0", 10),
          has_pool: !!form.has_pool,
          sea_distance: form.sea_distance?.trim() || null,
          lat: form.lat ? parseFloat(form.lat) : null,
          lng: form.lng ? parseFloat(form.lng) : null,
          is_hidden: !!form.is_hidden,
          priority,
          cleaning_fee: parseFloat(form.cleaning_fee || "0"),
          capacity: parseInt(form.capacity || "4", 10),
          // boolean özellikleri ekle
          ...features,
          province: form.province,
          district: form.district,
          neighborhood: form.neighborhood || null,
        },
        photos: photos.map((p, i) => ({
          url: p.url,
          is_primary: i === 0 ? true : !!p.is_primary,
          order_index: i,
        })),
        categoryIds,
        cleaning_fee: Math.max(0, Number(form.cleaning_fee || 0)),
      };

      const res = await fetch("/api/admin/villas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Oluşturma başarısız");
      }

      alert("Villa oluşturuldu.");
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
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Yeni Villa</h2>
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Villa Adı</label>
            <Input value={form.name} onChange={(e) => onChange("name", e.target.value)} required />
          </div>

          {/* WEEKLY_PRICE INPUT KALDIRILDI */}

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
            <label className="text-sm font-medium">Temizlik Ücreti (₺)</label>
            <Input
              type="number"
              min={0}
              value={form.cleaning_fee}
              onChange={(e) => onChange("cleaning_fee", e.target.value)}
              placeholder="7 günden az konaklamalarda uygulanır"
            />
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
            <label className="text-sm font-medium">Kapasite (Kişi)</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.capacity}
              onChange={(e) => onChange("capacity", e.target.value)}
              required
              placeholder="Maksimum kişi sayısı"
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
              value={form.lat}
              onChange={(e) => onChange("lat", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Longitude</label>
            <Input
              type="number"
              step="0.000001"
              value={form.lng}
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

        {/* Özellikler */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Emlak Özellikleri</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEATURE_DEFS.map((f) => (
              <label key={f.key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-black"
                  checked={!!features[f.key]}
                  onChange={(e) => toggleFeature(f.key, e.target.checked)}
                />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Konum */}
        <div className="mt-4">
          <LocationSelect
            value={{
              province: form.province,
              district: form.district,
              neighborhood: form.neighborhood,
            }}
            onChange={(v) => setForm((s) => ({ ...s, ...v }))}
          />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Fotoğraflar</h2>
        <PhotoManager villaId="new" initialPhotos={[]} onChange={setPhotos} />
        <div className="pt-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
