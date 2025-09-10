"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import PhotoGallery, { type GalleryPhoto } from "./PhotoGallery";

export default function GalleryLightbox({
  photos,
  className = "",
  initialIndex = 0,
}: {
  photos: GalleryPhoto[];
  className?: string;
  initialIndex?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`
          inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/10
          backdrop-blur px-4 py-2 text-white hover:bg-white/20 transition ${className}
        `}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ImageIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Resimlere Bak</span>
      </button>

      <PhotoGallery
        photos={photos}
        fullscreen
        isOpen={open}
        onClose={() => setOpen(false)}
        initialIndex={initialIndex}
        showThumbnails
      />
    </>
  );
}
