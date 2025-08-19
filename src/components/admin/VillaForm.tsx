"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function VillaForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    lat: "",
    lng: "",
    weekly_price: "",
    description: "",
    bedrooms: "1",
    bathrooms: "1",
    has_pool: false,
    sea_distance: "",
    is_hidden: false,
  });

  // Fotoğraf yükleme fonksiyonu
  // handlePhotoUpload fonksiyonunda değişiklik yapın:

  // Dosya adını temizleme fonksiyonu ekleyin (component'in üstüne)
  function sanitizeFileName(fileName: string): string {
    // Türkçe karakterleri değiştir
    const turkishChars: { [key: string]: string } = {
      ş: "s",
      Ş: "S",
      ğ: "g",
      Ğ: "G",
      ü: "u",
      Ü: "U",
      ı: "i",
      İ: "I",
      ö: "o",
      Ö: "O",
      ç: "c",
      Ç: "C",
      â: "a",
      Â: "A",
      î: "i",
      Î: "I",
    };

    let sanitized = fileName;

    // Türkçe karakterleri değiştir
    for (const [turkish, english] of Object.entries(turkishChars)) {
      sanitized = sanitized.replace(new RegExp(turkish, "g"), english);
    }

    // Boşlukları ve özel karakterleri değiştir
    sanitized = sanitized
      .replace(/\s+/g, "-") // Boşlukları tire ile değiştir
      .replace(/[^a-zA-Z0-9.-]/g, "") // Sadece harf, rakam, nokta ve tire bırak
      .replace(/--+/g, "-") // Çoklu tireleri tek tire yap
      .toLowerCase(); // Küçük harfe çevir

    return sanitized;
  }

  // handlePhotoUpload fonksiyonunu güncelle
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Maksimum 40 fotoğraf kontrolü
    if (uploadedPhotos.length + files.length > 40) {
      alert("Maksimum 40 fotoğraf yükleyebilirsiniz");
      return;
    }

    setUploadingPhotos(true);
    const supabase = createClient();
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Dosya boyutu kontrolü (15MB)
        if (file.size > 15 * 1024 * 1024) {
          alert(`${file.name} dosyası 15MB'dan büyük`);
          continue;
        }

        // Dosya tipi kontrolü
        if (!file.type.startsWith("image/")) {
          alert(`${file.name} bir resim dosyası değil`);
          continue;
        }

        // Dosya adını temizle ve unique yap
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`;
        const filePath = `${fileName}`; // villa-photos/ prefix'ini kaldırdık, bucket adı zaten belirtiliyor

        // Supabase Storage'a yükle
        const { data, error } = await supabase.storage.from("villa-photos").upload(filePath, file);

        if (error) {
          console.error("Upload error:", error);
          alert(`${file.name} yüklenirken hata oluştu: ${error.message}`);
          continue;
        }

        // Public URL'i al
        const {
          data: { publicUrl },
        } = supabase.storage.from("villa-photos").getPublicUrl(filePath);

        newPhotos.push(publicUrl);
      }

      setUploadedPhotos([...uploadedPhotos, ...newPhotos]);

      if (newPhotos.length > 0) {
        alert(`${newPhotos.length} fotoğraf başarıyla yüklendi`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Fotoğraf yüklenirken hata oluştu");
    } finally {
      setUploadingPhotos(false);
      // Input'u temizle
      e.target.value = "";
    }
  }

  // Fotoğraf silme
  function removePhoto(index: number) {
    setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== index));
  }

  // Fotoğraf sırasını değiştirme
  function movePhoto(fromIndex: number, toIndex: number) {
    const newPhotos = [...uploadedPhotos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);
    setUploadedPhotos(newPhotos);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (uploadedPhotos.length === 0) {
      alert("En az bir fotoğraf eklemelisiniz");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/villas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          weekly_price: parseFloat(formData.weekly_price),
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms),
          photos: uploadedPhotos, // Fotoğrafları da gönder
        }),
      });

      if (response.ok) {
        router.push("/admin/villas");
        router.refresh();
      } else {
        alert("Villa eklenirken hata oluştu");
      }
    } catch (error) {
      alert("Bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Genel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Villa Adı</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="location">Konum</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Enlem (Latitude)</Label>
              <Input
                id="lat"
                type="number"
                step="0.000001"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="lng">Boylam (Longitude)</Label>
              <Input
                id="lng"
                type="number"
                step="0.000001"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="weekly_price">Haftalık Fiyat (TL)</Label>
            <Input
              id="weekly_price"
              type="number"
              value={formData.weekly_price}
              onChange={(e) => setFormData({ ...formData, weekly_price: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Özellikler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bedrooms">Yatak Odası Sayısı</Label>
              <Input
                id="bedrooms"
                type="number"
                min="1"
                max="10"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="bathrooms">Banyo Sayısı</Label>
              <Input
                id="bathrooms"
                type="number"
                min="1"
                max="10"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sea_distance">Denize Mesafe</Label>
            <Input
              id="sea_distance"
              placeholder="Örn: 150 m"
              value={formData.sea_distance}
              onChange={(e) => setFormData({ ...formData, sea_distance: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_pool"
              checked={formData.has_pool}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, has_pool: checked as boolean })
              }
              disabled={isLoading}
            />
            <Label htmlFor="has_pool">Özel Havuz</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_hidden"
              checked={formData.is_hidden}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_hidden: checked as boolean })
              }
              disabled={isLoading}
            />
            <Label htmlFor="is_hidden">Gizli (Sadece özel link ile görünür)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Fotoğraf Yükleme Alanı */}
      <Card>
        <CardHeader>
          <CardTitle>Fotoğraflar (Maksimum 40)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Yükleme Butonu */}
            <div>
              <Label
                htmlFor="photos"
                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                {uploadingPhotos ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Fotoğraf Seç ({uploadedPhotos.length}/40)
                  </>
                )}
              </Label>
              <Input
                id="photos"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isLoading || uploadingPhotos}
                className="hidden"
              />
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG veya WebP formatında maksimum 15MB boyutunda dosyalar yükleyebilirsiniz.
              </p>
            </div>

            {/* Yüklenen Fotoğraflar */}
            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {uploadedPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Villa foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />

                    {/* Sil Butonu */}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Fotoğrafı sil"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Ana Fotoğraf Etiketi */}
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        Ana Fotoğraf
                      </span>
                    )}

                    {/* Sıra Numarası */}
                    <span className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </span>

                    {/* Sıralama Butonları */}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(index, index - 1)}
                          className="bg-blue-500 text-white p-1 rounded text-xs"
                          title="Öne taşı"
                        >
                          ←
                        </button>
                      )}
                      {index < uploadedPhotos.length - 1 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(index, index + 1)}
                          className="bg-blue-500 text-white p-1 rounded text-xs"
                          title="Arkaya taşı"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Boş Durum */}
            {uploadedPhotos.length === 0 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Henüz fotoğraf yüklenmemiş</p>
                <p className="text-xs text-gray-500 mt-1">
                  En az 1, maksimum 40 fotoğraf yükleyebilirsiniz
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading || uploadingPhotos}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            "Kaydet"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/villas")}
          disabled={isLoading}
        >
          İptal
        </Button>
      </div>
    </form>
  );
}
