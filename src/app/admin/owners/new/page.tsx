import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OwnerForm } from "@/components/admin/OwnerForm";

export default async function OwnerNewPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") {
    redirect("/admin-login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Yeni Sahip</h1>
      <OwnerForm mode="create" />
    </div>
  );
}
