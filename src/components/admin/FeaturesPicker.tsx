"use client";

type Feature = { id: string; name: string; slug: string };

export default function FeaturesPicker({
  features,
  selectedIds,
  onToggle,
  disabled = false,
}: {
  features: Feature[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Emlak Özellikleri</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {features.map((f) => {
          const checked = selectedIds.includes(f.id);
          return (
            <label
              key={f.id}
              className="flex items-center gap-2 rounded border p-2 hover:bg-muted/50 cursor-pointer"
            >
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={checked}
                onChange={() => onToggle(f.id)}
                disabled={disabled}
              />
              <span className="text-sm">{f.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
