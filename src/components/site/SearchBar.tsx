// src/components/site/SearchBar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SuggestItem = {
  id: string;
  name: string;
  reference_code?: string | null;
  cover_url?: string | null;
};

const DEBOUNCE_MS = 250;

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [highlight, setHighlight] = useState(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null); // dışarı tıklama için kapsayıcı

  // Temizlenmiş anahtar
  const normKey = useMemo(() => q.trim(), [q]);

  // Dışarı tıklayınca kapat (capture fazında pointerdown)
  useEffect(() => {
    const onOutside = (e: Event) => {
      if (!open) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (rootRef.current && !rootRef.current.contains(t)) {
        setOpen(false);
      }
    };
    // capture: true => diğer handler'lar stopPropagation yapsa bile yakalar
    document.addEventListener("pointerdown", onOutside, true);
    // Escape ile kapatmayı da koruyalım
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!normKey) {
      setItems([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        setLoading(true);
        const url = `/api/suggest?q=${encodeURIComponent(normKey)}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as { items: SuggestItem[] };
        setItems(json.items || []);
        setOpen((json.items || []).length > 0);
        setHighlight(0);
      } catch {
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [normKey]);

  // Klavye navigasyonu
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      goToBestMatch();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const goToBestMatch = () => {
    const target = items[highlight] || items[0];
    if (target) {
      router.push(`/villa/${target.id}`);
      setOpen(false);
    } else {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRe.test(normKey)) router.push(`/villa/${normKey}`);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToBestMatch();
  };

  return (
    <div className="relative" ref={rootRef}>
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpen(items.length > 0)}
            onKeyDown={onKeyDown}
            placeholder="Villa adı veya #REFKOD yazın…"
            className="pl-8"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="qs-suggest-list"
          />
        </div>
        <Button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white focus-visible:ring-orange-500 disabled:opacity-60"
          disabled={!q || loading}
        >
          Ara
        </Button>
      </form>

      {open && items.length > 0 && (
        <ul
          id="qs-suggest-list"
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-2 w-full rounded-lg border bg-white shadow-lg max-h-80 overflow-auto"
        >
          {items.map((it, i) => {
            const active = i === highlight;
            const url = it.cover_url || "/placeholder.jpg";
            return (
              <li
                key={it.id}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()} // blur'suz seçim
                onClick={() => {
                  setHighlight(i);
                  router.push(`/villa/${it.id}`);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 p-2 cursor-pointer ${active ? "bg-muted" : ""}`}
              >
                <div className="relative h-10 w-14 overflow-hidden rounded">
                  <Image
                    src={url}
                    alt={it.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.name}</p>
                  {it.reference_code && (
                    <p className="text-xs text-white inline-block bg-orange-500 px-1.5 py-0.5 rounded">
                      #{it.reference_code}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
