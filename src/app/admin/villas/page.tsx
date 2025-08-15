import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default async function AdminVillasPage() {
  const supabase = await createClient();

  const { data: villas, error } = await supabase
    .from("villas")
    .select(
      `
      *,
      photos:villa_photos(url, is_primary)
    `,
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Villalar</h1>
        <Button asChild>
          <Link href="/admin/villas/new">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Villa Ekle
          </Link>
        </Button>
      </div>

      {villas && villas.length > 0 ? (
        <div className="grid gap-4">
          {villas.map((villa) => (
            <Card key={villa.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{villa.name}</h3>
                    <p className="text-gray-500">{villa.location}</p>
                    <p className="text-sm mt-1">₺{villa.weekly_price} / hafta</p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/admin/villas/${villa.id}/edit`}>Düzenle</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500 mb-4">Henüz villa eklenmemiş.</p>
            <Button asChild>
              <Link href="/admin/villas/new">
                <Plus className="h-4 w-4 mr-2" />
                İlk Villayı Ekle
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
