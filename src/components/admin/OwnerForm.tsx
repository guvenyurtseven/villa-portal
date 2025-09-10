"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { OwnerCreateSchema, OwnerUpdateSchema } from "@/lib/validation/owner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Mode = "create" | "edit";

type BaseOwner = {
  full_name: string;
  phone: string;
  email: string;
};

type EditOwner = BaseOwner & { id: string };

export function OwnerForm({ mode, defaults }: { mode: Mode; defaults?: Partial<EditOwner> }) {
  const router = useRouter();

  // Şema: create'te zorunlu; edit'te partial (OwnerUpdateSchema)
  const schema = mode === "create" ? OwnerCreateSchema : OwnerUpdateSchema;
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: defaults?.full_name ?? "",
      phone: defaults?.phone ?? "",
      email: defaults?.email ?? "",
    } as any,
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (mode === "create") {
        const res = await fetch("/api/admin/owners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (res.status === 409) {
          setError("email" as any, { message: "Bu e-posta zaten kayıtlı." });
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `İstek başarısız (HTTP ${res.status})`);
        }
      } else {
        const id = (defaults as EditOwner)?.id;
        const res = await fetch(`/api/admin/owners/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (res.status === 409) {
          setError("email" as any, { message: "Bu e-posta zaten kayıtlı." });
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `İstek başarısız (HTTP ${res.status})`);
        }
      }

      // Başarılı → listeye dön ve sayfayı tazele
      router.push("/admin/owners");
      router.refresh();
    } catch (err: any) {
      // Genel hata
      setError("root" as any, { message: err?.message ?? "Bilinmeyen hata" });
    }
  };

  const onDelete = async () => {
    if (mode !== "edit") return;
    const id = (defaults as EditOwner)?.id;
    const ok = window.confirm("Bu sahip silinecek. Devam edilsin mi?");
    if (!ok) return;

    const res = await fetch(`/api/admin/owners/${id}`, { method: "DELETE" });
    if (res.status === 409) {
      alert("Bu sahibin atanmış villaları var. Önce villaları başka bir sahibe atayın.");
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || `Silme başarısız (HTTP ${res.status})`);
      return;
    }
    router.push("/admin/owners");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <label className="text-sm font-medium">Ad Soyad</label>
        <Input type="text" placeholder="Ad Soyad" {...register("full_name" as any)} />
        {errors?.full_name && (
          <p className="text-sm text-red-600">{String(errors.full_name.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Telefon (E.164)</label>
        <Input type="tel" placeholder="+905551112233" {...register("phone" as any)} />
        {errors?.phone && <p className="text-sm text-red-600">{String(errors.phone.message)}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">E-posta</label>
        <Input type="email" placeholder="owner@example.com" {...register("email" as any)} />
        {errors?.email && <p className="text-sm text-red-600">{String(errors.email.message)}</p>}
      </div>

      {errors?.root && <p className="text-sm text-red-600">{String(errors.root.message)}</p>}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {mode === "create" ? "Kaydet" : "Güncelle"}
        </Button>

        {mode === "edit" ? (
          <Button type="button" variant="outline" onClick={onDelete} disabled={isSubmitting}>
            Sil
          </Button>
        ) : null}
      </div>
    </form>
  );
}
