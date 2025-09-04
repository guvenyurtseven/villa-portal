// src/components/site/ReviewsSection.tsx
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";

function Stars({ value }: { value: number | null | undefined }) {
  const v = Math.max(0, Math.min(5, Number(value ?? 0)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`Puan: ${v} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= v;
        return (
          <Star
            key={i}
            className={filled ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-gray-300"}
            // Lucide ikonlarını doldurmak için fill="currentColor" kullanıyoruz; boşlar none.
            fill={filled ? "currentColor" : "none"}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
}

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
    <section className="mt-6 rounded-lg border bg-white p-4 space-y-4">
      <h3 className="text-lg font-semibold">Misafir Deneyimleri</h3>

      <div className="space-y-4">
        {list.map((r) => (
          <article
            key={r.id}
            className="rounded-xl border bg-white p-4 shadow-sm hover:shadow transition-shadow"
          >
            {/* Üst bilgi */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="font-medium">{r.guest_name || "Misafir"}</span>
              <time dateTime={r.created_at || undefined}>
                {r.created_at ? new Date(r.created_at).toLocaleDateString("tr-TR") : "-"}
              </time>
            </div>

            {/* Yorum metni */}
            {r.comment && (
              <p className="mt-3 text-gray-800 leading-relaxed whitespace-pre-wrap indent-8">
                {r.comment}
              </p>
            )}

            {r.comment && <div className="my-3 h-px w-1/2 bg-gray-200" />}

            {/* Kriterler: alt alta, yıldızlı gösterim */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Temizlik</span>
                <div className="flex items-center gap-2">
                  <Stars value={r.cleanliness_rating} />
                  <span className="text-xs text-gray-500">{r.cleanliness_rating}/5</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Konfor</span>
                <div className="flex items-center gap-2">
                  <Stars value={r.comfort_rating} />
                  <span className="text-xs text-gray-500">{r.comfort_rating}/5</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Hizmet</span>
                <div className="flex items-center gap-2">
                  <Stars value={r.hospitality_rating} />
                  <span className="text-xs text-gray-500">{r.hospitality_rating}/5</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
