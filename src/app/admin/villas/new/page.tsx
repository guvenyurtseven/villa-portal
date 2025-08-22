import { createServiceRoleClient } from "@/lib/supabase/server";
import VillaForm from "@/components/admin/VillaForm";

export default async function NewVillaPage() {
  const supabase = createServiceRoleClient();

  // Kategorileri çek
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Yeni Villa Ekle</h1>
      <VillaForm categories={(categories ?? []) as any} />
    </main>
  );
}
