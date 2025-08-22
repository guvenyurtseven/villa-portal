"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

export default function CardGallery({
  images,
  alt,
  className = "",
}: {
  images: string[] | undefined;
  alt: string;
  className?: string;
}) {
  const list = images && images.length > 0 ? images : ["/placeholder.jpg"];
  const [idx, setIdx] = useState(0);

  const clamp = useCallback((n: number) => (n + list.length) % list.length, [list.length]);

  const prev = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIdx((i) => clamp(i - 1));
  };

  const next = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
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

  return (
    <div
      className={`group relative h-56 select-none overflow-hidden ${className}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label="Foto galeri"
      role="region"
    >
      {/* current image */}
      <Image
        key={idx}
        src={list[idx]}
        alt={alt}
        fill
        className="
          object-cover
          transition-transform duration-400 ease-out
          md:group-hover:scale-[1.04]
          will-change-transform
        "
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />

      {/* soft gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/25 to-transparent" />

      {/* chevron-only nav with large invisible hit area */}
      {list.length > 1 && (
        <div
          className="
            absolute inset-y-0 left-0 right-0 flex items-center justify-between
            opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100
            transition-opacity duration-200
          "
        >
          <ArrowNavButton side="left" onClick={prev} />
          <ArrowNavButton side="right" onClick={next} />
        </div>
      )}

      {/* dots */}
      {list.length > 1 && (
        <div className="absolute z-10 bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
          {list.map((_, i) => (
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

/** Görünen sadece çift kenarlı ok (chevron); geniş görünmez tıklama alanı. */
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
      className="relative z-10 h-full w-14 sm:w-16 bg-transparent outline-none cursor-pointer"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* sadece çizgisel chevron; yarı saydam */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="30"
        height="30"
        className={`absolute top-1/2 -translate-y-1/2 ${
          isLeft ? "left-2" : "right-2"
        } transition-opacity md:opacity-0 md:group-hover:opacity-90 opacity-90`}
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isLeft ? (
          // ‹ (iki kenarlı)
          <polyline points="15 6 9 12 15 18" />
        ) : (
          // ›
          <polyline points="9 6 15 12 9 18" />
        )}
      </svg>

      {/* görünmez daha geniş hit alanı */}
      <span className="absolute -inset-2" aria-hidden="true" />
    </button>
  );
}
