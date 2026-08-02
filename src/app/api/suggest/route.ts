// src/app/api/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SuggestRow = {
  id: string;
  name: string;
  reference_code: string | null;
  cover_url: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("q") || "").trim();

    // Minimal hijyen ve erken çıkış
    if (!raw || raw.length < 1) {
      return NextResponse.json({ items: [] });
    }
    // 128 char sınırı (kötü niyetli aşırı uzun inputlar için)
    const q = raw.slice(0, 128);

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("search_villas_suggest", {
      q,
      lim: 7,
    });

    if (error) {
      console.error("suggest rpc error:", error);
      return NextResponse.json({ error: "Suggest failed" }, { status: 500 });
    }

    // Şekillendir
    const items = ((data ?? []) as SuggestRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      reference_code: r.reference_code,
      cover_url: r.cover_url,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
