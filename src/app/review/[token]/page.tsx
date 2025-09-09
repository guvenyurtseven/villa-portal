// src/app/review/[token]/page.tsx
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import ReviewForm from "@/components/ReviewForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  // Next.js 15: params Promise döner → await gerekli
  params: Promise<{ token: string }>;
}) {
  // ---- DEBUG: request metadata
  const hdrs = await headers();
  const host = hdrs.get("host");
  const referer = hdrs.get("referer");
  const userAgent = hdrs.get("user-agent");
  console.log("[review/page] start", {
    host,
    referer,
    userAgent,
    env: process.env.NODE_ENV,
  });

  // ---- DEBUG: token param
  let token: string | undefined;
  try {
    const p = await params;
    token = p?.token;
    console.log("[review/page] token param", token ? token.slice(0, 8) + "…" : "(yok)");
  } catch (e) {
    console.error("[review/page] params await failed", e);
  }

  if (!token) {
    console.warn("[review/page] no token → notFound()");
    notFound();
  }

  // ---- DEBUG: Supabase client
  const supabase = createServiceRoleClient();
  console.log("[review/page] supabase client created");

  // ---- DEBUG: RPC çağrısı
  let data: any = null;
  let error: any = null;
  try {
    const res = await supabase.rpc("validate_review_token", { token_value: token }).single();

    data = res.data;
    error = res.error;

    console.log("[review/page] validate_review_token result", {
      hasData: !!data,
      is_valid: data?.is_valid ?? null,
      villa_id: data?.villa_id ?? null,
      reservation_id: data?.reservation_id ?? null,
      error: error?.message ?? null,
    });
  } catch (e) {
    console.error("[review/page] RPC call threw", e);
    throw e; // İstersen notFound yerine 500'e de yönlendirebilirsin
  }

  if (error) {
    console.error("[review/page] RPC error → notFound()", error);
    notFound();
  }

  if (!data || !data.is_valid) {
    console.warn("[review/page] invalid/expired/used token → notFound()", {
      hasData: !!data,
      is_valid: data?.is_valid ?? null,
    });
    notFound();
  }

  console.log("[review/page] token OK", {
    villa_id: data.villa_id,
    reservation_id: data.reservation_id,
  });

  // Sadece formu gösteriyoruz
  return (
    <main className="max-w-xl mx-auto p-6">
      <ReviewForm
        token={token!}
        // villaName={data.villa_name}  // RPC böyle alan döndürüyorsa açabilirsin
        // guestName={data.guest_name}
      />
    </main>
  );
}
