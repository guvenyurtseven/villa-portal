"use client";

import { useEffect, useState } from "react";

export type CategoryOption = { id: string; name: string; slug: string };

export default function CategoryPicker({
  options,
  initialSelected = [],
  onChange,
}: {
  options: CategoryOption[];
  initialSelected?: string[];
  onChange: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected.join(",")]); // stable

  function toggle(id: string) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      onChange(next);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Kategoriler</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map((opt) => {
          const checked = selected.includes(opt.id);
          return (
            <label
              key={opt.id}
              className="inline-flex items-center gap-2 rounded border px-3 py-2 cursor-pointer hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt.id)}
                className="accent-black"
              />
              <span className="text-sm">{opt.name}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Bir villa birden fazla kategoriye dahil olabilir.
      </p>
    </div>
  );
}
