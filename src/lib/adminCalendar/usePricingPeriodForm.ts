"use client";

import { useCallback, useState } from "react";
import type { DateRange } from "react-day-picker";
import { buildPricingPeriodPayload } from "@/lib/adminCalendar/payloads";

type UsePricingPeriodFormOptions = {
  villaId: string;
  reload: () => Promise<void>;
};

export function usePricingPeriodForm({ villaId, reload }: UsePricingPeriodFormOptions) {
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [pricingRange, setPricingRange] = useState<DateRange | undefined>();
  const [nightlyPrice, setNightlyPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const savePricingPeriod = useCallback(async () => {
    if (!pricingRange?.from || !pricingRange?.to || !nightlyPrice) {
      alert("Lütfen tarih aralığı ve fiyat girin");
      return;
    }

    setSavingPrice(true);

    try {
      const res = await fetch("/api/admin/pricing-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPricingPeriodPayload(villaId, pricingRange, nightlyPrice)),
      });

      if (res.ok) {
        setPricingRange(undefined);
        setNightlyPrice("");
        setShowPricingForm(false);
        void reload();
        alert("Fiyat dönemi başarıyla eklendi");
      } else {
        const error = await res.json();
        alert(error.error || "Hata oluştu");
      }
    } catch {
      alert("Hata oluştu");
    } finally {
      setSavingPrice(false);
    }
  }, [nightlyPrice, pricingRange, reload, villaId]);

  const removePricingPeriod = useCallback(
    async (periodId: string) => {
      if (!confirm("Bu fiyat dönemini silmek istediğinizden emin misiniz?")) return;

      try {
        const res = await fetch(`/api/admin/pricing-periods?id=${periodId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          void reload();
          alert("Fiyat dönemi silindi");
        }
      } catch {
        alert("Hata oluştu");
      }
    },
    [reload],
  );

  return {
    showPricingForm,
    setShowPricingForm,
    pricingRange,
    setPricingRange,
    nightlyPrice,
    setNightlyPrice,
    savingPrice,
    savePricingPeriod,
    removePricingPeriod,
  };
}
