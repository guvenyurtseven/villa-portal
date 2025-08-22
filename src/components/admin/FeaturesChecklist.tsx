"use client";

import { FEATURES, FeatureKey } from "@/constants/features";

export function FeaturesChecklist({
  values,
  onToggle,
}: {
  values: Partial<Record<FeatureKey, boolean>>;
  onToggle: (key: FeatureKey, next: boolean) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold mb-3">Emlak Özellikleri</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FEATURES.map((f) => {
          const checked = !!values[f.key];
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={checked}
                onChange={(e) => onToggle(f.key, e.target.checked)}
              />
              <span>{f.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
