import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { OwnerForm } from "@/components/admin/OwnerForm";

type Props = { params: Promise<{ id: string }> }; // Next 15: async params

export default async function OwnerEditPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") {
    redirect("/admin-login");
  }

  const supabase = createServiceRoleClient();
  const { data: owner, error } = await supabase
    .from("owners_with_villas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !owner) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sahip Düzenle</h1>
      <OwnerForm
        mode="edit"
        defaults={{
          id: owner.id,
          full_name: owner.full_name,
          phone: owner.phone,
          email: owner.email,
        }}
      />
      {/* Opsiyonel: Bu sahibin villaları / kısa özet */}
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        Bu sahibin villa sayısı: {Array.isArray(owner.villa_ids) ? owner.villa_ids.length : 0}
      </div>
    </div>
  );
}
