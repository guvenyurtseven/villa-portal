import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import ReviewForm from "@/components/ReviewForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("validate_review_token", { token_value: token }).single();

  if (error || !data || !data.is_valid) {
    notFound();
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <ReviewForm token={token} />
    </main>
  );
}