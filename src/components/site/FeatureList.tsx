export default function FeatureList({ items }: { items: { id: string; name: string }[] }) {
  if (!items?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Özellikler</h3>

      {/* Grid hücrelerini merkezle + olası liste padding/bulletlarını sıfırla */}
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 place-items-center place-content-center list-none p-0">
        {items.map((f) => (
          /* Her item’ı kendi hücresinde ortala; genişliği içeriğe göre olsun */
          <li
            key={f.id}
            className="justify-self-center w-fit flex items-center gap-2 text-sm text-center"
          >
            {/* ✓ tam ortaya */}
            <span className="inline-grid h-4 w-4 place-items-center rounded-sm bg-emerald-500 text-white text-[11px] leading-none">
              ✓
            </span>
            <span className="whitespace-pre-line">{f.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
