"use client";

import * as React from "react";

// API'dan beklenen minimal şekil
type Owner = { id: string; full_name: string; email?: string; phone?: string };

export function OwnerSelect({
  value,
  onChange,
  placeholder = "Sahip seç (opsiyonel)",
  disabled,
  required,
  name, // GET formunda istersen name kullanabilirsin
}: {
  value?: string | null;
  onChange?: (ownerId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}) {
  const [owners, setOwners] = React.useState<Owner[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Türkçe sıralama için collator (I/İ gibi farkları doğru ele alır)
  // MDN Intl.Collator: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator
  const collator = React.useMemo(() => new Intl.Collator("tr-TR", { sensitivity: "base" }), []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Listeyi API'dan çekiyoruz; sayıyı makul tutmak için pageSize'ı büyüttük.
        const res = await fetch("/api/admin/owners?page=1&pageSize=1000", { cache: "no-store" });
        if (!res.ok) throw new Error(`Sahip listesi alınamadı (HTTP ${res.status}).`);
        const json = await res.json();
        const items = (json?.items ?? []) as Owner[];

        // Ad-soyada göre Türkçe locale ile alfabetik
        items.sort((a, b) => collator.compare(a.full_name || "", b.full_name || ""));

        if (mounted) setOwners(items);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Bilinmeyen hata");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [collator]);

  // İlk harfe göre gruplama (Türkçe upper-case)
  const groups = React.useMemo(() => {
    const map = new Map<string, Owner[]>();
    for (const o of owners) {
      const label = (o.full_name ?? "").trim();
      const first = label ? label[0] : "#";
      // Türkçe büyük harfe çevir (İ/ı doğru işlensin)
      const key = first.toLocaleUpperCase("tr-TR");
      const bucket = map.get(key) ?? [];
      bucket.push(o);
      map.set(key, bucket);
    }
    // grup içlerini de tekrar ada göre sırala
    for (const [k, arr] of map) {
      arr.sort((a, b) => collator.compare(a.full_name || "", b.full_name || ""));
      map.set(k, arr);
    }
    // grup anahtarlarını Türkçe sıralı diziye çevir
    const keys = Array.from(map.keys()).sort(collator.compare);
    return keys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [owners, collator]);

  return (
    <div className="w-full">
      <select
        name={name}
        className="w-full rounded-md border px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value || null)}
        disabled={disabled || loading || !!error}
        required={required}
      >
        {/* Placeholder / temizle seçeneği */}
        <option value="">{loading ? "Yükleniyor..." : (error ?? placeholder)}</option>

        {/* Gruplar (optgroup) — MDN: optgroup ile dropdown içi gruplama */}
        {groups.map((g) => (
          <optgroup key={g.key} label={g.key}>
            {g.items.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name}
                {o.email ? ` • ${o.email}` : ""}
                {o.phone ? ` • ${o.phone}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
