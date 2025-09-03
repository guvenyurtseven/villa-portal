// src/app/review/[token]/page.tsx
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import ReviewForm from "@/components/ReviewForm"; // kendi konumuna göre düzelt

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next 15: params Promise → await!
  const { token: tokenFromPath } = await params;
  const sp = (await searchParams) || {};
  // Eski linkler için geri uyumluluk: ?token=... da kabul et
  const tokenQ =
    typeof sp.token === "string" ? sp.token : Array.isArray(sp.token) ? sp.token[0] : "";
  const token = tokenFromPath || tokenQ;

  if (!token) notFound();

  const supabase = createServiceRoleClient();
  // DB fonksiyonu ile token doğrulama (sunucuda)
  const { data, error } = await supabase
    .rpc("validate_review_token", { token_value: token })
    .single(); // Supabase RPC kullanımı: :contentReference[oaicite:2]{index=2}

  if (error || !data || !data.is_valid) {
    notFound();
  }

  // Sadece formu render et (başka UI yok)
  return (
    <main className="max-w-xl mx-auto p-6">
      <ReviewForm
        token={token}
        // istersen şunları da geçebilirsin:
        // villaName={data.villa_name}
        // guestName={data.guest_name}
      />
    </main>
  );
}
