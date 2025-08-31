"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";

interface MapModalProps {
  villaName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function MapModal({ villaName, coordinates }: MapModalProps) {
  // Varsayılan açık
  const [isOpen, setIsOpen] = useState(true);

  // Koordinatları doğrula
  const { lat, lng } = coordinates || {};
  const hasValidCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  // Google Maps linkleri
  const { embedUrl, mapsUrl } = useMemo(() => {
    if (!hasValidCoords) {
      return { embedUrl: "", mapsUrl: "" };
    }
    const zoom = 16; // İsteğe göre 5–18 arası
    // Anahtarsız embed: q=lat,lng araması + output=embed → pin gösterir
    // Ayrıca Türkçe arayüz için hl=tr ekledik
    const embed = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=tr&output=embed`;
    const open = `https://www.google.com/maps?q=${lat},${lng}`;
    return { embedUrl: embed, mapsUrl: open };
  }, [hasValidCoords, lat, lng]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Konum
        </h3>
        <Button onClick={() => setIsOpen((v) => !v)} variant="ghost" size="sm">
          {isOpen ? <X className="h-4 w-4" /> : "Haritayı Göster"}
        </Button>
      </div>

      {!hasValidCoords ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-600">
          Bu villa için konum bilgisi eksik veya geçersiz.
        </div>
      ) : (
        isOpen && (
          <div className="space-y-4">
            <div className="h-96 w-full rounded-lg overflow-hidden border">
              <iframe
                key={`${lat},${lng}`} // koordinatlar değişirse yeniden yükle
                title={`${villaName} Harita`}
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <Button
              onClick={() => window.open(mapsUrl, "_blank")}
              variant="outline"
              className="w-full"
            >
              Google Maps'te Aç
            </Button>
          </div>
        )
      )}
    </div>
  );
}
