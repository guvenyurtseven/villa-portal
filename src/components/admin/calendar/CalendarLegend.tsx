"use client";

type CalendarLegendProps = {
  showPricingLegend: boolean;
  showDiscountLegend: boolean;
};

export function CalendarLegend({ showPricingLegend, showDiscountLegend }: CalendarLegendProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="h-3 w-5 rounded border bg-white" />
        <span>Müsait</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-5 rounded border"
          style={{ background: "linear-gradient(135deg, #fb923c 50%, white 50%)" }}
        />
        <span>Check-out günü</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-5 rounded border"
          style={{ background: "linear-gradient(135deg, white 50%, #fb923c 50%)" }}
        />
        <span>Check-in günü</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-5 rounded border"
          style={{
            background:
              "linear-gradient(135deg, transparent 44%, white 44%, white 56%, transparent 56%), #fb923c",
          }}
        />
        <span>Devir günü</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-5 rounded bg-orange-500" />
        <span>Dolu</span>
      </div>
      {showPricingLegend && (
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-5 rounded border bg-white"
            style={{ boxShadow: "inset 0 -4px #f9a8d4" }}
          />
          <span>Fiyat Tanımlı</span>
        </div>
      )}
      {showDiscountLegend && (
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-5 rounded border bg-white"
            style={{ boxShadow: "inset 0 -4px #ef4444" }}
          />
          <span>İndirimli Dönem</span>
        </div>
      )}
    </div>
  );
}
