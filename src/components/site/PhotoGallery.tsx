// src/components/site/PhotoGallery.tsx
"use client";
import Image from "next/image";
import { useState } from "react";

export default function PhotoGallery({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);

  if (!photos?.length) return null;

  return (
    <div>
      <div className="mb-3">
        <Image
          src={photos[index]}
          alt={`Foto ${index + 1}`}
          width={1200}
          height={700}
          className="w-full h-[420px] object-cover rounded-xl"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((src, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`relative h-20 w-32 flex-shrink-0 rounded-md overflow-hidden border ${i === index ? "border-blue-600" : "border-transparent"}`}
            aria-label={`Foto ${i + 1}`}
          >
            <Image src={src} alt="" fill className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
