"use client";

import { useCallback } from "react";
import type { ReservationStatus } from "@/domain/reservations/ReservationStatus";

type UseReservationActionsOptions = {
  reload: () => Promise<void>;
};

export function useReservationActions({ reload }: UseReservationActionsOptions) {
  const updateReservationStatus = useCallback(
    async (reservationId: string, status: ReservationStatus) => {
      try {
        const res = await fetch(`/api/admin/reservations/${reservationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Rezervasyon guncellenemedi");
        }

        void reload();
        alert(`Rezervasyon ${status === "confirmed" ? "onaylandi" : "iptal edildi"}`);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Hata olustu");
      }
    },
    [reload],
  );

  return { updateReservationStatus };
}
