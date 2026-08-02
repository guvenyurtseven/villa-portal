"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { DateRange } from "react-day-picker";
import { buildDiscountPeriodPayload } from "@/lib/adminCalendar/payloads";
import type { DiscountPeriod } from "@/lib/adminCalendar/types";

type UseDiscountPeriodFormOptions = {
  villaId: string;
  setDiscountPeriods: Dispatch<SetStateAction<DiscountPeriod[]>>;
};

export function useDiscountPeriodForm({
  villaId,
  setDiscountPeriods,
}: UseDiscountPeriodFormOptions) {
  const [newDiscountRange, setNewDiscountRange] = useState<DateRange | undefined>();
  const [newDiscountPrice, setNewDiscountPrice] = useState("");
  const [newDiscountPriority, setNewDiscountPriority] = useState(5);
  const [savingDiscount, setSavingDiscount] = useState(false);

  const addDiscountPeriod = useCallback(async () => {
    if (!newDiscountRange?.from || !newDiscountRange?.to) return;
    if (!newDiscountPrice) return;
    if (!villaId) {
      alert("Villa ID okunamadı.");
      return;
    }

    setSavingDiscount(true);
    try {
      const res = await fetch("/api/admin/discount-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildDiscountPeriodPayload(
            villaId,
            newDiscountRange,
            newDiscountPrice,
            newDiscountPriority,
          ),
        ),
      });

      if (res.ok) {
        const { period } = await res.json();
        setDiscountPeriods((prev) =>
          [...prev, period].sort((a, b) => a.start_date.localeCompare(b.start_date)),
        );
        setNewDiscountRange(undefined);
        setNewDiscountPrice("");
        setNewDiscountPriority(5);
      } else if (res.status === 409) {
        alert("Seçilen tarih, mevcut bir indirim dönemiyle çakışıyor.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Kayıt başarısız");
      }
    } finally {
      setSavingDiscount(false);
    }
  }, [
    newDiscountPrice,
    newDiscountPriority,
    newDiscountRange,
    setDiscountPeriods,
    villaId,
  ]);

  const removeDiscountPeriod = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/discount-periods?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setDiscountPeriods((prev) => prev.filter((period) => period.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Silme başarısız");
      }
    },
    [setDiscountPeriods],
  );

  return {
    newDiscountRange,
    setNewDiscountRange,
    newDiscountPrice,
    setNewDiscountPrice,
    newDiscountPriority,
    setNewDiscountPriority,
    savingDiscount,
    addDiscountPeriod,
    removeDiscountPeriod,
  };
}
