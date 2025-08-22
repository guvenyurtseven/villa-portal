export default function FeatureList({ items }: { items: { id: string; name: string }[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Özellikler</h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
        {items.map((f) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-4 w-4 rounded-sm bg-emerald-500 text-white grid place-items-center">
              ✓
            </span>
            <span>{f.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
