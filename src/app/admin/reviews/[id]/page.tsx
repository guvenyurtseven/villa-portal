import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReviewActions from "@/components/admin/reviews/ReviewActions";

export const runtime = "nodejs";

export default async function AdminReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: review, error } = await supabase.from("reviews").select("*").eq("id", id).single();

  if (error || !review) notFound();

  // Villa adı
  let villaName = "Bilinmeyen Villa";
  if (review.villa_id) {
    const { data: villa } = await supabase
      .from("villas")
      .select("id, name")
      .eq("id", review.villa_id)
      .single();
    if (villa?.name) villaName = villa.name;
  }

  // Kapak fotoğrafı
  let coverUrl: string | undefined;
  if (review.villa_id) {
    const { data: photos } = await supabase
      .from("villa_photos")
      .select("url, is_primary, order_index")
      .eq("villa_id", review.villa_id);

    coverUrl = (photos ?? [])
      .sort((a, b) => {
        const ap = a.is_primary ? 0 : 1;
        const bp = b.is_primary ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (a.order_index ?? 999) - (b.order_index ?? 999);
      })
      .at(0)?.url;
  }

  const dateStr = review.created_at ? new Date(review.created_at).toLocaleString("tr-TR") : "-";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Yorum Detayı</h1>
        <Button asChild variant="outline">
          <Link href="/admin/reviews">Geri</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 flex-shrink-0">
              <Image
                src={coverUrl || "/placeholder.jpg"}
                alt={villaName}
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{villaName}</h2>
              <p className="text-sm text-gray-600">{dateStr}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p>
                <b>Ad Soyad:</b> {review.guest_name || "-"}
              </p>
              <p>
                <b>E-posta:</b> {review.guest_email || "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <b>Temizlik:</b> {review.cleanliness_rating ?? "-"}
              </p>
              <p>
                <b>Konfor:</b> {review.comfort_rating ?? "-"}
              </p>
              <p>
                <b>Misafirperverlik:</b> {review.hospitality_rating ?? "-"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Yorum</p>
            <p className="whitespace-pre-wrap text-gray-800">{review.comment || "-"}</p>
          </div>

          <div className="pt-2 flex gap-3">
            <ReviewActions reviewId={review.id} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
