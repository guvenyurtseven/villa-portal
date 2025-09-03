import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function ReviewsSection({ villaId }: { villaId: string }) {
  const supabase = createServiceRoleClient();

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, guest_name, cleanliness_rating, comfort_rating, hospitality_rating, comment, created_at",
    )
    .eq("villa_id", villaId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const list = reviews ?? [];
  if (list.length === 0) return null;

  return (
    <section className="mt-6 rounded-lg border bg-white p-4 space-y-3">
      <h3 className="text-lg font-semibold">Misafir Yorumları</h3>
      <div className="space-y-3">
        {list.map((r) => (
          <div key={r.id} className="border rounded-md p-3">
            <div className="text-sm text-gray-600">
              {r.guest_name || "Misafir"} •{" "}
              {r.created_at ? new Date(r.created_at).toLocaleDateString("tr-TR") : "-"}
            </div>
            <div className="text-sm mt-1">
              Temizlik: {r.cleanliness_rating} • Konfor: {r.comfort_rating} • Misafirperverlik:{" "}
              {r.hospitality_rating}
            </div>
            <p className="mt-2 text-gray-800 whitespace-pre-wrap">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
