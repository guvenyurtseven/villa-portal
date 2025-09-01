// src/app/api/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
      return NextResponse.json({ items: [] });
    }

    // Şekillendir
    const items = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      reference_code: r.reference_code,
      cover_url: r.cover_url,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
