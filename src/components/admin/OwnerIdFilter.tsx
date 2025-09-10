"use client";

import * as React from "react";
import { OwnerSelect } from "@/components/admin/OwnerSelect";

export function OwnerIdFilter({
  defaultOwnerId,
  autosubmit = false,
  formId,
}: {
  defaultOwnerId?: string;
  autosubmit?: boolean;
  formId?: string;
}) {
  const [ownerId, setOwnerId] = React.useState<string | null>(defaultOwnerId || null);

  React.useEffect(() => {
    if (!autosubmit || !formId) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const t = setTimeout(() => form.requestSubmit(), 50);
    return () => clearTimeout(t);
  }, [ownerId, autosubmit, formId]);

  return (
    <div className="w-full">
      <OwnerSelect value={ownerId} onChange={setOwnerId} placeholder="Sahip seç (opsiyonel)" />
      {/* GET formuna owner_id olarak gönder */}
      <input type="hidden" name="owner_id" value={ownerId ?? ""} />
    </div>
  );
}
