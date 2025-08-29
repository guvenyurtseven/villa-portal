"use client";

import { LOCATIONS } from "@/data/locations";
import { Label } from "@/components/ui/label";
import { useMemo } from "react";

type Value = { province: string; district: string; neighborhood: string };
export default function LocationSelect({
  value,
  onChange,
  required = true,
}: {
  value: Value;
  onChange: (v: Partial<Value>) => void;
  required?: boolean;
}) {
  const provinces = useMemo(() => Object.keys(LOCATIONS), []);
  const districts = useMemo(
    () => (value.province ? Object.keys(LOCATIONS[value.province] || {}) : []),
    [value.province],
  );
  const neighborhoods = useMemo(
    () =>
      value.province && value.district ? LOCATIONS[value.province]?.[value.district] || [] : [],
    [value.province, value.district],
  );

  return (
    <div className="grid md:grid-cols-3 gap-3">
      <div>
        <Label className="text-sm">İl</Label>
        <select
          className="mt-1 w-full border rounded-md h-9 px-2"
          value={value.province}
          onChange={(e) => onChange({ province: e.target.value, district: "", neighborhood: "" })}
          required={required}
        >
          <option value="">Seçiniz</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-sm">İlçe</Label>
        <select
          className="mt-1 w-full border rounded-md h-9 px-2"
          value={value.district}
          onChange={(e) => onChange({ district: e.target.value, neighborhood: "" })}
          disabled={!value.province}
          required={required}
        >
          <option value="">Seçiniz</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-sm">Mahalle (opsiyonel)</Label>
        <select
          className="mt-1 w-full border rounded-md h-9 px-2"
          value={value.neighborhood}
          onChange={(e) => onChange({ neighborhood: e.target.value })}
          disabled={!value.district}
        >
          <option value="">Seçiniz</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          En az <strong>İl + İlçe</strong> seçilmelidir.
        </p>
      </div>
    </div>
  );
}
