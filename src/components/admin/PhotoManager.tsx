"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@supabase/supabase-js";
import { applyWatermark } from "@/lib/watermark";

type Photo = {
  id?: string;
  url: string;
  is_primary: boolean;
  order_index: number;
};

type Props = {
  villaId: string;
  initialPhotos: Photo[];
  onChange: (photos: Photo[]) => void;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function extFromMime(m: string | undefined | null): "jpg" | "png" | "webp" {
  switch (m) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export default function PhotoManager({ villaId, initialPhotos, onChange }: Props) {
  // Normalize + ilk foto kapak
  const normalized = useMemo(() => {
    const list = [...(initialPhotos ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((p, i) => ({ ...p, order_index: i }));
    if (list.length) list.forEach((p, i) => (p.is_primary = i === 0));
    return list;
  }, [initialPhotos]);

  const [photos, setPhotos] = useState<Photo[]>(normalized);
  const [uploading, setUploading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const dragIndex = useRef<number | null>(null);

  // Supabase'a gitmeden önce parent'a senkron tut
  useEffect(() => {
    const synced = photos.map((p, i) => ({
      ...p,
      order_index: i,
      is_primary: i === 0, // ilk foto kapak
    }));
    onChange(synced);
  }, [photos, onChange]);

  // Upload + WATERMARK
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const toAdd: Photo[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 15 * 1024 * 1024) continue; // 15MB üstünü atla (isteğe göre artırılabilir)

        // 1) Damgalamayı dene (Canvas) — başarısız olursa orijinale düş
        let toUpload: File = file;
        try {
          toUpload = await applyWatermark(file, {
            // dilediğin ayarları aç: tile:true => desen gibi döşer
            // tile: true,
            // scale: 0.26,
            // opacity: 0.12,
            // maxWidth: 2400,
          });
        } catch (err) {
          console.warn("Watermark uygulanamadı, orijinal dosya yüklenecek.", err);
        }

        // 2) Anahtar + içerik türü
        const ext = extFromMime(toUpload.type);
        const key = `${villaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: upErr } = await supabase.storage.from("villa-photos").upload(key, toUpload, {
          upsert: false,
          contentType: toUpload.type || (ext === "jpg" ? "image/jpeg" : `image/${ext}`),
        });

        if (upErr) throw upErr;

        const { data } = supabase.storage.from("villa-photos").getPublicUrl(key);
        toAdd.push({
          url: data.publicUrl,
          is_primary: false,
          order_index: photos.length + toAdd.length,
        });
      }

      setPhotos((prev) => [...prev, ...toAdd].map((p, i) => ({ ...p, order_index: i })));
    } catch (e) {
      console.error(e);
      alert("Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  // Select & bulk delete
  const totalSelected = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const toggleSelected = (idx: number, v: boolean) =>
    setSelected((prev) => ({ ...prev, [idx]: v }));
  const deleteSelected = () => {
    if (!Object.values(selected).some(Boolean)) return;
    setPhotos((prev) =>
      prev.filter((_, i) => !selected[i]).map((p, i) => ({ ...p, order_index: i })),
    );
    setSelected({});
  };

  // Drag & drop
  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const onDragOver = () => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === idx) return;
    setPhotos((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(idx, 0, moved);
      return arr.map((p, i) => ({ ...p, order_index: i }));
    });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div>
          <label className="text-sm font-medium">Fotoğraf Yükle</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="block text-sm"
          />
          {uploading && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant={selectMode ? "default" : "outline"}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected({});
            }}
          >
            {selectMode ? "Seçim Modu: Açık" : "Seçim Modu: Kapalı"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!totalSelected}
            onClick={deleteSelected}
          >
            Seçilileri Sil ({totalSelected})
          </Button>
        </div>
      </div>

      {/* Grid – butonsuz sade kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {photos.map((p, idx) => (
          <div
            key={(p.id ?? "new") + "-" + idx}
            draggable
            onDragStart={onDragStart(idx)}
            onDragOver={onDragOver()}
            onDrop={onDrop(idx)}
            className={`relative rounded-lg border overflow-hidden bg-muted/20 ${
              selectMode && selected[idx] ? "ring-2 ring-primary" : ""
            }`}
            title="Sırayı değiştirmek için sürükleyin"
          >
            {/* Kapak rozeti: ilk foto */}
            {idx === 0 && (
              <div className="absolute left-1 top-1 z-10 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white">
                Kapak
              </div>
            )}

            {/* Seçim Modu checkbox (sağ üst) */}
            {selectMode && (
              <div className="absolute right-1 top-1 z-10 bg-black/40 rounded px-1 py-0.5">
                <Checkbox
                  checked={!!selected[idx]}
                  onCheckedChange={(v) => toggleSelected(idx, !!v)}
                  id={`sel-${idx}`}
                />
              </div>
            )}

            <div className="relative w-full aspect-[4/3]">
              <Image
                src={p.url}
                alt={`photo-${idx}`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 16vw"
                className="object-cover"
                priority={idx < 4}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        İpucu: Fotoğrafları sürükleyerek sıralayın. <b>İlk fotoğraf kapak</b> olarak kullanılır.
        Silmek için <b>Seçim Modu</b>nu açıp görselleri işaretleyin ve <b>Seçilileri Sil</b>{" "}
        butonunu kullanın.
      </p>
    </div>
  );
}
