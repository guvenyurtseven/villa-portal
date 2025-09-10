"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cn from "clsx";

export type GalleryPhoto = {
  id?: string;
  url?: string | null;
  alt?: string;
  is_primary?: boolean | null;
  order_index?: number | null;
};

type CommonProps = {
  photos: GalleryPhoto[] | null | undefined;
  alt?: string;
  className?: string;
};

type InlineProps = CommonProps & {
  aspect?: string; // sadece inline'da
  fullscreen?: false;
};

type LightboxProps = CommonProps & {
  fullscreen: true; // lightbox modu
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
  showFilmstrip?: boolean; // alt şerit: varsayılan true (dinamik kayar)
  centerMode?: boolean; // ortada aktif, kenarlarda komşu görseller
};

type Props = InlineProps | LightboxProps;

export default function PhotoGallery(props: Props) {
  // --- her zaman aynı sırada/aynı sayıda hook çağır ---
  const valid = useMemo(
    () =>
      (props.photos ?? [])
        .filter((p) => typeof p?.url === "string" && p!.url!.trim().length > 0)
        .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)),
    [props.photos],
  );
  const total = valid.length;

  const [idx, setIdx] = useState(
    "fullscreen" in props && props.fullscreen && typeof props.initialIndex === "number"
      ? Math.max(0, Math.min(props.initialIndex, Math.max(0, total - 1)))
      : 0,
  );

  // out-of-range koruması
  useEffect(() => {
    if (total > 0 && idx > total - 1) setIdx(0);
  }, [total, idx]);

  // sabit yardımcılar
  const clamp = useCallback((n: number) => ((n % total) + total) % total, [total]);
  const prev = useCallback(() => {
    if (!total) return;
    setIdx((i) => clamp(i - 1));
  }, [total, clamp]);
  const next = useCallback(() => {
    if (!total) return;
    setIdx((i) => clamp(i + 1));
  }, [total, clamp]);

  // dokunmatik swipe
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 30) dx > 0 ? prev() : next();
    touchStartX.current = null;
  };

  // lightbox için ref'ler (KOŞULSUZ tanımla → hook sırası sabit)
  const stripRef = useRef<HTMLDivElement | null>(null);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  // Lightbox: Esc / ok tuşları + body scroll kilidi
  useEffect(() => {
    if (!("fullscreen" in props) || !props.fullscreen || !props.isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };

    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [props, prev, next]);

  // Film şeridi: aktif thumb'ı merkeze kaydır (Hook koşulsuz, koşul içeride)
  useEffect(() => {
    if (!("fullscreen" in props) || !props.fullscreen || !props.isOpen) return;
    const el = activeThumbRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [idx, props]);

  // boş galeri durumları
  if (total === 0) {
    if (!("fullscreen" in props && props.fullscreen)) {
      const aspect = (props as InlineProps).aspect ?? "aspect-[16/10]";
      return <div className={cn("w-full rounded-lg bg-gray-100", aspect, props.className || "")} />;
    }
    // lightbox kapalıysa render etme
    if (!props.isOpen) return null;
  }

  const current = valid[Math.min(idx, Math.max(0, total - 1))];
  const src = (current?.url || "/placeholder.jpg") as string;

  // ---------------------------
  // LIGHTBOX (tam ekran modal)
  // ---------------------------
  if ("fullscreen" in props && props.fullscreen) {
    if (!props.isOpen) return null;

    const centerMode = props.centerMode ?? true;
    const showFilmstrip = props.showFilmstrip ?? true;
    const leftIdx = clamp(idx - 1);
    const rightIdx = clamp(idx + 1);

    return (
      <div
        className="fixed inset-0 w-screen h-screen z-[10000] bg-black/95"
        role="dialog"
        aria-modal="true"
        aria-label="Fotoğraf galeri (tam ekran)"
        onClick={props.onClose}
      >
        {/* Kapat */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onClose();
          }}
          aria-label="Kapat"
          className="absolute right-4 top-4 z-30 rounded-full bg-white/15 hover:bg-white/25 text-white px-3 py-1.5"
        >
          ×
        </button>

        {/* Prev/Next */}
        {total > 1 && (
          <>
            <button
              aria-label="Önceki fotoğraf"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full grid place-items-center bg-white/15 hover:bg-white/25 text-white border border-white/30"
            >
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
            <button
              aria-label="Sonraki fotoğraf"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                next();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full grid place-items-center bg-white/15 hover:bg-white/25 text-white border border-white/30"
            >
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </>
        )}

        {/* Geniş tıklama alanları */}
        {total > 1 && (
          <>
            <button
              aria-hidden
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prev();
              }}
              className="absolute inset-y-0 left-0 w-1/4"
            />
            <button
              aria-hidden
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                next();
              }}
              className="absolute inset-y-0 right-0 w-1/4"
            />
          </>
        )}

        {/* İçerik */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative w-screen h-screen">
            {centerMode ? (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* sol komşu */}
                {total > 1 && (
                  <div className="relative h-[86vh] w-[36vw] max-w-[680px] mx-1 scale-[0.92] opacity-70">
                    <Image
                      key={`L${leftIdx}`}
                      src={(valid[leftIdx]?.url as string) ?? src}
                      alt={valid[leftIdx]?.alt ?? props.alt}
                      fill
                      className="object-contain"
                      sizes="36vw"
                      priority
                      onClick={prev}
                    />
                  </div>
                )}
                {/* merkez */}
                <div className="relative h-[88vh] w-[64vw] max-w-[1280px] mx-1">
                  <Image
                    key={`C${idx}`}
                    src={src}
                    alt={current?.alt ?? props.alt}
                    fill
                    className="object-contain"
                    sizes="64vw"
                    priority
                  />
                </div>
                {/* sağ komşu */}
                {total > 1 && (
                  <div className="relative h-[86vh] w-[36vw] max-w-[680px] mx-1 scale-[0.92] opacity-70">
                    <Image
                      key={`R${rightIdx}`}
                      src={(valid[rightIdx]?.url as string) ?? src}
                      alt={valid[rightIdx]?.alt ?? props.alt}
                      fill
                      className="object-contain"
                      sizes="36vw"
                      priority
                      onClick={next}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-[96vw] h-[88vh]">
                  <Image
                    key={idx}
                    src={src}
                    alt={current?.alt ?? props.alt}
                    fill
                    className="object-contain"
                    sizes="100vw"
                    priority
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alt film şeridi (dinamik kayar) */}
        {showFilmstrip && total > 1 && (
          <div
            className="absolute left-0 right-0 bottom-0 z-30 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={stripRef}
              className="mx-auto max-w-[92vw] px-0 py-2 overflow-x-auto no-scrollbar scroll-smooth"
            >
              <div className="flex items-center gap-0">
                {valid.map((p, i) => {
                  const isActive = i === idx;
                  return (
                    <button
                      key={p.id ?? i}
                      ref={isActive ? activeThumbRef : undefined}
                      onClick={() => setIdx(i)}
                      aria-label={`Fotoğraf ${i + 1}`}
                      className={cn(
                        "relative h-16 w-24 flex-shrink-0 overflow-hidden transition",
                        isActive
                          ? "outline outline-2 outline-white"
                          : "opacity-80 hover:opacity-100",
                      )}
                    >
                      <Image
                        src={p.url as string}
                        alt={p.alt ?? props.alt}
                        fill
                        className="object-cover"
                        sizes="10vw"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------
  // INLINE (eski davranış)
  // ---------------------------
  const aspect = (props as InlineProps).aspect ?? "aspect-[16/10]";

  return (
    <div
      className={cn("group relative w-full overflow-hidden rounded-lg", props.className || "")}
      tabIndex={0}
      aria-label="Foto galeri"
      role="region"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={cn("relative w-full", aspect)}>
        <Image
          key={idx}
          src={src}
          alt={current?.alt ?? props.alt}
          fill
          className="object-cover transition-transform duration-500 ease-out md:group-hover:scale-[1.03] will-change-transform"
          sizes="(max-width: 768px) 100vw, 70vw"
        />
      </div>
    </div>
  );
}
