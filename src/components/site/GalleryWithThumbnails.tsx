// src/components/site/GalleryWithThumbnails.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GalleryWithThumbnails({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);

  function goPrev() {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }
  function goNext() {
    setIndex((i) => (i + 1) % photos.length);
  }

  return (
    <div>
      {/* Ana görsel */}
      <div className="relative w-full h-[420px] rounded-xl overflow-hidden bg-gray-100">
        <Image
          src={photos[index]}
          alt={`Foto ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1024px"
        />

        {/* Prev / Next */}
        <div className="absolute inset-y-0 left-2 flex items-center">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={goPrev}
            aria-label="Önceki"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-2 flex items-center">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={goNext}
            aria-label="Sonraki"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Thumbnail şerit */}
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {photos.map((p, i) => (
          <button
            key={p + i}
            onClick={() => setIndex(i)}
            className={`relative h-20 w-28 flex-shrink-0 rounded-md overflow-hidden border ${
              i === index ? "ring-2 ring-black" : "border-gray-200"
            }`}
            aria-label={`Foto ${i + 1}`}
          >
            <Image src={p} alt={`thumb ${i + 1}`} fill className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
