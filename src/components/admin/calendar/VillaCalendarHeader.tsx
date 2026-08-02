"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Villa } from "@/lib/adminCalendar/types";

type VillaCalendarHeaderProps = {
  villa: Villa | null;
};

export function VillaCalendarHeader({ villa }: VillaCalendarHeaderProps) {
  const router = useRouter();
  const primaryPhoto =
    villa?.photos?.find((photo) => photo.is_primary)?.url ||
    villa?.photos?.[0]?.url ||
    "/placeholder.jpg";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <Image
            src={primaryPhoto}
            alt={villa?.name || "Villa"}
            width={128}
            height={128}
            className="w-32 h-32 object-cover rounded-lg"
          />

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{villa?.name || "Villa"}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Fiyat dönemleri aşağıdan tanımlanabilir
            </p>
          </div>

          <Button variant="outline" onClick={() => router.push("/admin/villas")}>
            Villalar Listesi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
