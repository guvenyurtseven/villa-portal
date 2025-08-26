import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default async function AdminVillasPage() {
  // Service role client kullanarak tüm villaları al (gizli olanlar dahil)
  const supabase = createServiceRoleClient();

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
          {villas.map((villa) => {
            // Birincil fotoğrafı bul
            const primaryPhoto =
              villa.photos?.find((p: any) => p.is_primary)?.url ||
              villa.photos?.[0]?.url ||
              "/placeholder.jpg";

            return (
              <Card key={villa.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {/* Villa Fotoğrafı */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <Image
                          src={primaryPhoto}
                          alt={villa.name}
                          className="w-full h-full object-cover rounded-lg"
                          width={96}
                          height={96}
                        />
                      </div>

                      {/* Villa Bilgileri */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{villa.name}</h3>
                          {/* Gizli Durumu Badge */}
                          {villa.is_hidden ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <EyeOff className="h-3 w-3" />
                              Gizli
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                              <Eye className="h-3 w-3" />
                              Yayında
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          {/* WEEKLY PRICE KALDIRILDI */}
                          <span className="text-sm text-gray-500">
                            {villa.bedrooms} Yatak • {villa.bathrooms} Banyo
                            {villa.has_pool && " • Havuz"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/villas/${villa.id}/calendar`}>Takvim</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/villas/${villa.id}/edit`}>Düzenle</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
