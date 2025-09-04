// src/components/admin/pending/PendingReservationCard.tsx
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingReservationCard(props: {
  id: string;
  villaName: string;
  guestName: string;
  dateText: string;
  coverUrl?: string;
  href: string;
  highlight?: boolean;
}) {
  const { villaName, guestName, dateText, coverUrl, href, highlight } = props;
  return (
    <Link href={href} className="block">
      <Card className={highlight ? "ring-2 ring-orange-500" : ""}>
        <CardContent className="p-4 flex gap-3">
          <div className="relative w-24 h-16 rounded overflow-hidden border bg-muted/30 flex-shrink-0">
            <Image
              src={coverUrl || "/placeholder.jpg"}
              alt={villaName}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{villaName}</div>
            <div className="text-sm text-gray-600 truncate">Misafir: {guestName || "-"}</div>
            <div className="text-sm">{dateText}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
