"use client";

import { useSearchParams } from "next/navigation";
import { parseISO } from "date-fns";
import BookingForm from "@/components/site/BookingForm";

export default function BookingPage() {
  const searchParams = useSearchParams();

  const villaName = searchParams.get("villaName") || "";
  const villaImage = searchParams.get("villaImage") || "";
  const from = searchParams.get("from") ? parseISO(searchParams.get("from")!) : null;
  const to = searchParams.get("to") ? parseISO(searchParams.get("to")!) : null;
  const nights = Number(searchParams.get("nights") || 0);
  const total = Number(searchParams.get("total") || 0);
  const deposit = Number(searchParams.get("deposit") || 0);

  if (!villaName || !villaImage || !from || !to) {
    return <p className="p-6">Eksik veya hatalı rezervasyon bilgisi.</p>;
  }

  return (
    <div className="container mx-auto py-6">
      <BookingForm
        villaName={villaName}
        villaImage={villaImage}
        from={from}
        to={to}
        nights={nights}
        total={total}
        deposit={deposit}
      />
    </div>
  );
}
