// src/app/admin/villas/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import VillaEditForm from "@/components/admin/VillaEditForm";
import { auth } from "@/lib/auth";

type Params = { id: string };

export default async function EditVillaPage({ params }: { params: Params }) {
  // Admin değilse AdminLayout zaten engelliyor; yine de burada da kontrol kalsın
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Villa + fotoğraflar
  const { data: villa, error: villaErr } = await supabase
    .from("villas")
    .select("*")
    .eq("id", params.id)
    .single();

  if (villaErr || !villa) {
    notFound();
  }

  const { data: photos, error: photosErr } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", params.id)
    .order("order_index", { ascending: true });

  if (photosErr) {
    // Foto yoksa boş dizi
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Villa Düzenle: <span className="font-bold">{villa.name}</span>
        </h1>
        <p className="text-sm text-muted-foreground">ID: {params.id}</p>
      </div>

      <VillaEditForm initialVilla={villa} initialPhotos={photos ?? []} />
    </div>
  );
}
