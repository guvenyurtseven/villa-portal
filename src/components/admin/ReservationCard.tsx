"use client";

import Link from "next/link";
import { displayPgDateRange } from "@/lib/pgRange";

type ReservationItem = {
  id: string;
  villaName: string;
  guestName: string;
  guestPhone: string;
  dateRange: string;
  status: string;
};

export default function ReservationCard({ item }: { item: ReservationItem }) {
  return (
    <Link
      href={`/admin/reservations/${item.id}`}
      className="block rounded-2xl border border-gray-200 hover:shadow-md transition p-4 bg-white"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">{item.villaName}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{item.status}</span>
      </div>

      <div className="mt-2 text-sm text-gray-700">
        <div>
          <span className="font-medium">Müşteri:</span> {item.guestName}
        </div>
        <div>
          <span className="font-medium">Telefon:</span> {item.guestPhone}
        </div>
        <div>
          <span className="font-medium">Tarih:</span> {displayPgDateRange(item.dateRange)}
        </div>
      </div>
    </Link>
  );
}
