import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  return Response.json({ session }, { status: 200 });
}
