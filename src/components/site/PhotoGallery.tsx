"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cn from "clsx";

type GalleryPhoto = {
  id?: string;
  url?: string | null;
  alt?: string;
  is_primary?: boolean | null;
  order_index?: number | null;
};

export default function PhotoGallery({
  photos,
  alt = "Villa fotoğrafı",
  className = "",
  aspect = "aspect-[16/10]",
}: {
  photos: GalleryPhoto[] | null | undefined;
  alt?: string;
  className?: string;
  /** Tailwind aspect class */
  aspect?: string;
}) {
  const valid = useMemo(() => {
    return (photos ?? [])
      .filter((p) => typeof p?.url === "string" && p!.url!.trim().length > 0)
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
  }, [photos]);

  const total = valid.length;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (total > 0 && idx > total - 1) setIdx(0);
  }, [total, idx]);

  const clamp = useCallback((n: number) => ((n % total) + total) % total, [total]);

  const prev = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!total) return;
    setIdx((i) => clamp(i - 1));
  };

  const next = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!total) return;
    setIdx((i) => clamp(i + 1));
  };

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 30) (dx > 0 ? prev() : next)();
    touchStartX.current = null;
  };

  // Keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  if (total === 0) {
    return <div className={cn("w-full rounded-lg bg-gray-100", aspect, className)} />;
  }

  const current = valid[Math.min(idx, total - 1)];
  const src = current.url as string;

  return (
    <div
      className={cn("group relative w-full overflow-hidden rounded-lg", className)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label="Foto galeri"
      role="region"
    >
      {/* Görsel + hover'da yumuşak zoom-in */}
      <div className={cn("relative w-full", aspect)}>
        <Image
          key={idx}
          src={src}
          alt={current.alt ?? alt}
          fill
          className="
            object-cover
            transition-transform duration-500 ease-out
            md:group-hover:scale-[1.03]
            will-change-transform
          "
          sizes="(max-width: 768px) 100vw, 70vw"
        />
      </div>

      {/* üst/alt yumuşak gradyanlar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />

      {/* büyütülmüş chevron-only nav + geniş görünmez hit alanı */}
      {total > 1 && (
        <div
          className="
            absolute inset-y-0 left-0 right-0 flex items-center justify-between
            opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100
            transition-opacity duration-200 z-20
          "
        >
          <ArrowNavButton side="left" onClick={prev} />
          <ArrowNavButton side="right" onClick={next} />
        </div>
      )}

      {/* noktalar */}
      {total > 1 && (
        <div className="absolute z-20 bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
          {valid.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Fotoğraf ${i + 1}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIdx(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-4 bg-white shadow" : "w-2 bg-white/70 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** CardGallery ile aynı; ~2× büyütüldü. */
function ArrowNavButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: (e: React.MouseEvent) => void;
}) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      aria-label={isLeft ? "Önceki fotoğraf" : "Sonraki fotoğraf"}
      onClick={onClick}
      className="relative z-20 h-full w-24 sm:w-28 bg-transparent outline-none cursor-pointer"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* daha büyük çizgisel chevron */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="56"
        height="56"
        className={`absolute top-1/2 -translate-y-1/2 ${
          isLeft ? "left-3" : "right-3"
        } transition-opacity md:opacity-0 md:group-hover:opacity-95 opacity-95`}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isLeft ? <polyline points="15 6 9 12 15 18" /> : <polyline points="9 6 15 12 9 18" />}
      </svg>

      {/* görünmez ekstra geniş vurma alanı */}
      <span className="absolute -inset-3" aria-hidden="true" />
    </button>
  );
}
