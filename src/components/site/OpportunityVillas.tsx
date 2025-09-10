"use client";

import { useState, useEffect } from "react";
import OpportunityVillaCard from "./OpportunityVillaCard";
import { Sparkles } from "lucide-react";

interface OpportunityVilla {
  id: string;
  name: string;
  images?: string[];
  province?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  capacity?: number;
  opportunities: Array<{
    startDate: string;
    endDate: string;
    nights: number;
    totalPrice: number;
    nightlyPrice: number;
  }>;
  bedrooms?: number | null; // API alanı
  bathrooms?: number | null; // API alanı
}

export default function OpportunityVillas() {
  const [villas, setVillas] = useState<OpportunityVilla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunityVillas() {
      try {
        const response = await fetch("/api/opportunity-villas");
        if (response.ok) {
          const data = await response.json();
          setVillas(data);
        }
      } catch (error) {
        console.error("Error fetching opportunity villas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunityVillas();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32"></div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!villas || villas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold">Fırsat Villalar</h2>
        </div>
        <div className="text-sm text-gray-500 text-center py-8">
          Şu anda fırsat dönemi bulunmuyor
        </div>
      </div>
    );
  }

  return (
    <div className="w-auto space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-semibold">Fırsat Villalar</h2>
      </div>

      <div className="grid gap-4">
        {villas.map((villa) =>
          villa.opportunities.map((opportunity, idx) => (
            <OpportunityVillaCard
              key={`${villa.id}-${idx}`}
              villaId={villa.id}
              villaName={villa.name}
              capacity={villa.capacity}
              photo={villa.images?.[0]}
              opportunity={opportunity}
              province={villa.province ?? undefined}
              district={villa.district ?? undefined}
              neighborhood={villa.neighborhood ?? undefined}
              // çoğuldan tekile normalleştir
              bedroom={villa.bedrooms ?? null}
              bathroom={villa.bathrooms ?? null}
            />
          )),
        )}
      </div>
    </div>
  );
}
