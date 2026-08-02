// src/components/admin/OwnerCard.tsx
import Link from "next/link";

type Owner = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  villa_ids?: string[];
};

export function OwnerCard({ owner }: { owner: Owner }) {
  const villaCount = owner.villa_ids?.length ?? 0;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="truncate text-base font-medium">{owner.full_name}</div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
          <span>{owner.phone}</span>
          <span className="truncate">{owner.email}</span>
          <span>Villalar: {villaCount}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/admin/owners/${owner.id}/edit`}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Düzenle
        </Link>
      </div>
    </div>
  );
}
