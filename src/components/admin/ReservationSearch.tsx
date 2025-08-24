"use client";

import { useEffect, useMemo, useState } from "react";
import ReservationCard from "./ReservationCard";

type Result = {
  id: string;
  villaName: string;
  guestName: string;
  guestPhone: string;
  dateRange: string;
  status: string;
};

export default function ReservationSearch() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setLoading(true);
      try {
        const url =
          "/api/admin/reservations/search" +
          (debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : "");
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!ignore) setResults(json.results || []);
      } catch (e) {
        if (!ignore) setResults([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [debouncedQ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Müşteri adı, telefon veya villa adı... Örn: +905462711279"
          className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {loading && <span className="text-sm text-gray-500">Aranıyor…</span>}
      </div>

      {results.length === 0 && !loading && (
        <div className="text-sm text-gray-500">Sonuç bulunamadı.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {results.map((r) => (
          <ReservationCard key={r.id} item={r} />
        ))}
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay = 300) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}
