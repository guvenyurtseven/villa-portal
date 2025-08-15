"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  // Google Maps Embed URL'leri (API key gerektirmez)
  const previewMapUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${coordinates.lng}!3d${coordinates.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDAyJzAzLjkiTiAyN8KwMjUnNTMuOCJF!5e0!3m2!1str!2str!4v1629875000000!5m2!1str!2str`;

  // Google Maps'te açma linki
  const googleMapsUrl = `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`;

  return (
    <>
      {/* Tıklanabilir önizleme harita */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-500" />
          Konum
        </h3>
        <div
          className="relative cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow group"
          onClick={() => setIsOpen(true)}
        >
          <div className="w-full h-48 bg-gray-200 overflow-hidden">
            <iframe
              src={previewMapUrl}
              width="100%"
              height="100%"
              style={{ border: 0, pointerEvents: "none" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
          <div className="absolute bottom-3 left-3 bg-white px-3 py-1 rounded-full shadow-md">
            <p className="text-sm font-medium text-gray-800">{location}</p>
          </div>
          <div className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-md">
            <MapPin className="h-4 w-4 text-red-500" />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2 text-center">Haritayı büyütmek için tıklayın</p>
      </div>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              {villaName} - Konum
            </DialogTitle>
            <p className="text-gray-600">{location}</p>
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="relative rounded-lg overflow-hidden shadow-lg">
              <div className="w-full h-96">
                <iframe
                  src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${coordinates.lng}!3d${coordinates.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDAyJzAzLjkiTiAyN8KwMjUnNTMuOCJF!5e0!3m2!1str!2str!4v1629875000000!5m2!1str!2str`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="absolute bottom-4 right-4">
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Google Maps'te Aç
                  </a>
                </Button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Konum Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Adres:</span> {location}
                </div>
                <div>
                  <span className="font-medium">Koordinatlar:</span> {coordinates.lat.toFixed(4)},{" "}
                  {coordinates.lng.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
