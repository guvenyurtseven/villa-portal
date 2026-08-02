"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseCalendarDateRange } from "@/lib/adminCalendar/calendarDates";
import type { IdHandler } from "@/lib/adminCalendar/callbackTypes";
import type { BlockedDate } from "@/lib/adminCalendar/types";

type BlockedDatesListProps = {
  blockedDates: BlockedDate[];
  onRemoveBlock: IdHandler;
};

export function BlockedDatesList({ blockedDates, onRemoveBlock }: BlockedDatesListProps) {
  const maintenanceBlocks = blockedDates.filter((blockedDate) => blockedDate.reason !== "Rezervasyon");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temizlik/Bakım Tarihleri</CardTitle>
      </CardHeader>
      <CardContent>
        {maintenanceBlocks.length > 0 ? (
          <div className="space-y-2">
            {maintenanceBlocks.map((blockedDate) => {
              const dates = parseCalendarDateRange(blockedDate.date_range);
              return (
                <div
                  key={blockedDate.id}
                  className="flex justify-between items-center border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">
                      {dates.start} - {dates.end}
                    </p>
                    <p className="text-sm text-gray-500">{blockedDate.reason || "Temizlik"}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onRemoveBlock(blockedDate.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Temizlik/bakım için bloke edilmiş tarih bulunmuyor.</p>
        )}
      </CardContent>
    </Card>
  );
}
