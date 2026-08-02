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
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Image
            src={primaryPhoto}
            alt={villa?.name || "Villa"}
            width={128}
            height={128}
            className="h-40 w-full rounded-lg object-cover sm:h-32 sm:w-32 sm:shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{villa?.name || "Villa"}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Fiyat dönemleri aşağıdan tanımlanabilir
            </p>
          </div>

          <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/admin/villas")}>
            Villalar Listesi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
