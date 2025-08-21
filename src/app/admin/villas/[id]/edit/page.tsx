// src/app/admin/villas/[id]/edit/page.tsx
import { createServiceRoleClient } from "@/lib/supabase/server";
import VillaEditForm from "@/components/admin/VillaEditForm";
import { notFound } from "next/navigation";

export default async function EditVillaPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = createServiceRoleClient(); // ✅ artık doğru fonksiyon

  // Villa verisini çek
  const { data: villa, error: villaErr } = await supabase
    .from("villas")
    .select("*")
    .eq("id", id)
    .single();

  if (villaErr || !villa) {
    console.error("Villa yüklenemedi:", villaErr);
    notFound();
  }

  // Fotoğrafları çek
  const { data: photos, error: photosErr } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", id)
    .order("order_index", { ascending: true });

  if (photosErr) {
    console.error("Fotoğraflar yüklenemedi:", photosErr);
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Villa Düzenle: <span className="font-bold">{villa.name}</span>
        </h1>
        <p className="text-sm text-muted-foreground">ID: {id}</p>
      </div>

      <VillaEditForm initialVilla={villa} initialPhotos={photos ?? []} />
    </div>
  );
}
