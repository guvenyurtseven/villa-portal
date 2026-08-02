"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  reservationStatusColor,
  reservationStatusLabel,
} from "@/domain/reservations/ReservationStatus";
import { parseCalendarDateRange } from "@/lib/adminCalendar/calendarDates";
import type { ReservationStatusHandler } from "@/lib/adminCalendar/callbackTypes";
import type { Reservation } from "@/lib/adminCalendar/types";

type ReservationsListProps = {
  reservations: Reservation[];
  onUpdateReservationStatus: ReservationStatusHandler;
};

export function ReservationsList({
  reservations,
  onUpdateReservationStatus,
}: ReservationsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rezervasyonlar</CardTitle>
      </CardHeader>
      <CardContent>
        {reservations.length > 0 ? (
          <div className="space-y-4">
            {reservations.map((reservation) => {
              const dates = parseCalendarDateRange(reservation.date_range);
              return (
                <div key={reservation.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-lg">{reservation.guest_name}</p>
                      <p className="text-sm text-gray-600">📞 {reservation.guest_phone}</p>
                      {reservation.guest_email && (
                        <p className="text-sm text-gray-600">✉️ {reservation.guest_email}</p>
                      )}
                      <p className="text-sm mt-2">
                        📅 {dates.start} - {dates.end}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        💰 ₺{reservation.total_price?.toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${reservationStatusColor(
                          reservation.status,
                        )}`}
                      >
                        {reservationStatusLabel(reservation.status)}
                      </span>
                      {reservation.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateReservationStatus(reservation.id, "confirmed")}
                          >
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onUpdateReservationStatus(reservation.id, "cancelled")}
                          >
                            İptal
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Henüz rezervasyon bulunmuyor.</p>
        )}
      </CardContent>
    </Card>
  );
}
