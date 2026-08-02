"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  BlockReasonChangeHandler,
  StringChangeHandler,
} from "@/lib/adminCalendar/callbackTypes";
import type { BlockReason } from "@/lib/adminCalendar/types";

type BlockDatesPanelProps = {
  selectedRange: DateRange | undefined;
  blockReason: BlockReason;
  onBlockReasonChange: BlockReasonChangeHandler;
  customerName: string;
  onCustomerNameChange: StringChangeHandler;
  customerPhone: string;
  onCustomerPhoneChange: StringChangeHandler;
  customerEmail: string;
  onCustomerEmailChange: StringChangeHandler;
  blocking: boolean;
  onBlockDates: () => void;
};

export function BlockDatesPanel({
  selectedRange,
  blockReason,
  onBlockReasonChange,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerEmail,
  onCustomerEmailChange,
  blocking,
  onBlockDates,
}: BlockDatesPanelProps) {
  return (
    <>
      {selectedRange?.from && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Seçilen Tarihler:</p>
          <p className="text-sm">
            {format(selectedRange.from, "dd MMMM yyyy", { locale: tr })}
            {selectedRange.to && ` - ${format(selectedRange.to, "dd MMMM yyyy", { locale: tr })}`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Label>Bloke Tipi</Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              value="rezervasyon"
              checked={blockReason === "rezervasyon"}
              onChange={() => onBlockReasonChange("rezervasyon")}
              className="w-4 h-4"
            />
            <span>Rezervasyon</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="blockType"
              value="temizlik"
              checked={blockReason === "temizlik"}
              onChange={() => onBlockReasonChange("temizlik")}
              className="w-4 h-4"
            />
            <span>Temizlik</span>
          </label>
        </div>
      </div>

      {blockReason === "rezervasyon" && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName">
                Ad Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">
                Telefon <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(event) => onCustomerPhoneChange(event.target.value)}
                placeholder="Örn: 0555 123 45 67"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="customerEmail">
                E-posta <span className="text-gray-400">(Opsiyonel)</span>
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(event) => onCustomerEmailChange(event.target.value)}
                placeholder="Örn: musteri@email.com"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBlockDates} disabled={blocking || !selectedRange?.from} className="w-full">
        {blocking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Kaydediliyor...
          </>
        ) : (
          <>
            <Calendar className="mr-2 h-4 w-4" />
            Tarihleri Bloke Et
          </>
        )}
      </Button>
    </>
  );
}
