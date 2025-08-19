"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface MapModalProps {
  villaName: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function MapModal({ villaName, location, coordinates }: MapModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Google Maps URL oluştur
  const googleMapsUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;

  // Embed URL
  const embedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${coordinates.lng}!3d${coordinates.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM!5e0!3m2!1str!2str!4v1234567890`;

  return (
    <div className="mt-6">
      <Button onClick={() => setIsOpen(!isOpen)} variant="outline" className="w-full">
        <MapPin className="mr-2 h-4 w-4" />
        Haritada Göster
      </Button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div className="h-96 w-full rounded-lg overflow-hidden border">
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <Button
            onClick={() => window.open(googleMapsUrl, "_blank")}
            variant="outline"
            className="w-full"
          >
            Google Maps'te Aç
          </Button>
        </div>
      )}
    </div>
  );
}
