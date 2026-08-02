import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import ReviewForm from "@/components/ReviewForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewTokenValidation = {
  is_valid: boolean;
  error?: string | null;
  villa_id?: string | null;
  reservation_id?: string | null;
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("validate_review_token", { token_value: token }).single();
  const validation = data as ReviewTokenValidation | null;

  if (error || !validation?.is_valid) {
    notFound();
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <ReviewForm token={token} />
    </main>
  );
}
