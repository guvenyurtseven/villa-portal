//\src\components\site\VillaCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type VillaCardProps = {
  id: string;
  name: string;
  location: string;
  pricePerWeek: string | number;
  image: string;
};

export default function VillaCard({ id, name, location, pricePerWeek, image }: VillaCardProps) {
  return (
    <Card className="w-72 min-w-[18rem] shadow-md">
      <CardHeader className="p-0">
        <Image
          src={image}
          alt={name}
          width={300}
          height={200}
          className="rounded-t-xl object-cover h-48 w-full"
        />
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-gray-500">{location}</p>
        <p className="mt-2 font-bold">{pricePerWeek} / hafta</p>

        <Button asChild variant="outline" className="mt-3 w-full">
          <Link href={`/villa/${id}`} target="_blank" rel="noopener noreferrer">
            Detaylar
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
