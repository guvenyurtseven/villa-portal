"use client";

import { useCallback, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  buildBlockedDatePayload,
  buildManualReservationPayload,
} from "@/lib/adminCalendar/payloads";
import type { BlockReason } from "@/lib/adminCalendar/types";

type UseBlockDatesFormOptions = {
  villaId: string;
  reload: () => Promise<void>;
};

export function useBlockDatesForm({ villaId, reload }: UseBlockDatesFormOptions) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [blockReason, setBlockReason] = useState<BlockReason>("rezervasyon");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [blocking, setBlocking] = useState(false);

  const blockDates = useCallback(async () => {
    if (!selectedRange?.from || !selectedRange?.to) {
      alert("Lütfen tarih aralığı seçin");
      return;
    }

    if (blockReason === "rezervasyon" && (!customerName || !customerPhone)) {
      alert("Rezervasyon için müşteri adı ve telefonu zorunludur");
      return;
    }

    setBlocking(true);

    try {
      if (blockReason === "rezervasyon") {
        const resResponse = await fetch("/api/admin/manual-reservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildManualReservationPayload(
              villaId,
              selectedRange,
              customerName,
              customerPhone,
              customerEmail,
            ),
          ),
        });

        if (resResponse.ok) {
          setSelectedRange(undefined);
          setCustomerName("");
          setCustomerPhone("");
          setCustomerEmail("");
          void reload();
          alert("Rezervasyon başarıyla oluşturuldu");
        } else {
          const error = await resResponse.json();
          alert(error.error || "Hata oluştu");
        }
      } else {
        const res = await fetch("/api/admin/blocked-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBlockedDatePayload(villaId, selectedRange)),
        });

        if (res.ok) {
          setSelectedRange(undefined);
          void reload();
          alert("Tarihler bloke edildi");
        } else {
          const error = await res.json();
          alert(error.error || "Hata oluştu");
        }
      }
    } catch {
      alert("Hata oluştu");
    } finally {
      setBlocking(false);
    }
  }, [blockReason, customerEmail, customerName, customerPhone, reload, selectedRange, villaId]);

  const removeBlock = useCallback(
    async (blockId: string) => {
      if (!confirm("Bu blokajı kaldırmak istediğinizden emin misiniz?")) return;

      try {
        const res = await fetch(`/api/admin/blocked-dates?id=${blockId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          void reload();
          alert("Blokaj kaldırıldı");
        }
      } catch {
        alert("Hata oluştu");
      }
    },
    [reload],
  );

  return {
    selectedRange,
    setSelectedRange,
    blockReason,
    setBlockReason,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerEmail,
    setCustomerEmail,
    blocking,
    blockDates,
    removeBlock,
  };
}
