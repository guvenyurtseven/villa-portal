import { createServiceRoleClient } from "@/lib/supabase/server";
import VillaEditForm from "@/components/admin/VillaEditForm";
import { notFound } from "next/navigation";

interface Props {
  params: { id: string } | Promise<{ id: string }>;
}

export default async function EditVillaPage({ params }: Props) {
  const { id } = await Promise.resolve(params);
  const supabase = createServiceRoleClient();

  const { data: villa, error: villaErr } = await supabase
    .from("villas")
    .select("*")
    .eq("id", id)
    .single();

  if (villaErr || !villa) {
    return notFound();
  }

  const { data: photos } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", id)
    .order("order_index", { ascending: true });

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const { data: currentLinks } = await supabase
    .from("villa_categories")
    .select("category_id")
    .eq("villa_id", id);

  const selectedCategoryIds = (currentLinks ?? []).map((r) => r.category_id);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Villa Düzenle: {villa.name}</h1>
      <p className="text-sm text-muted-foreground">ID: {id}</p>

      <VillaEditForm
        initialVilla={villa as any}
        initialPhotos={(photos ?? []) as any}
        categories={(categories ?? []) as any}
        initialCategoryIds={selectedCategoryIds}
      />
    </main>
  );
}
