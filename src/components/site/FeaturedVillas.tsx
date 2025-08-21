// src/components/site/FeaturedVillas.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

/** Detay sayfası kök yolu (site grubunda): /villa/[id] */
const VILLA_DETAIL_PATH = "/villa";

type DBVilla = {
  id: string;
  name: string;
  location: string | null;
  weekly_price: number | null;
  is_hidden: boolean | null;
  priority: number | null;
};

type DBPhoto = {
  id: string;
  villa_id: string;
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Eşit priority grupları içinde basit shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchVillasWithCover(): Promise<Array<DBVilla & { coverUrl: string | null }>> {
  const supabase = supabaseAnon();

  // 1) Villalar (RLS gereği public sadece is_hidden=false görür)
  const { data: villas, error: vErr } = await supabase
    .from("villas")
    .select("id,name,location,weekly_price,is_hidden,priority")
    .order("priority", { ascending: false });

  if (vErr || !villas || villas.length === 0) return [];

  // 2) Yalnızca bu villaların fotoğraflarını çek
  const villaIds = villas.map((v) => v.id);
  const { data: photos } = villaIds.length
    ? await supabase
        .from("villa_photos")
        .select("id,villa_id,url,is_primary,order_index")
        .in("villa_id", villaIds)
    : { data: [] as DBPhoto[] };

  // 3) Her villa için kapak fotoğrafını belirle
  const coverByVilla = new Map<string, string>();
  (photos ?? [])
    .sort((a, b) => {
      // önce primary olanlar, sonra küçük order_index
      const pa = (a.is_primary ? 0 : 1) - (b.is_primary ? 0 : 1);
      if (pa !== 0) return pa;
      return (a.order_index ?? 9999) - (b.order_index ?? 9999);
    })
    .forEach((p) => {
      if (!coverByVilla.has(p.villa_id)) coverByVilla.set(p.villa_id, p.url);
    });

  const withCover = villas.map((v) => ({
    ...v,
    priority: v.priority ?? 1,
    coverUrl: coverByVilla.get(v.id) ?? null,
  }));

  // 4) Eşit priority gruplarını kendi içinde karıştır
  const groups = new Map<number, Array<DBVilla & { coverUrl: string | null }>>();
  for (const v of withCover) {
    const key = v.priority ?? 1;
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  const priorities = Array.from(groups.keys()).sort((a, b) => b - a);
  const merged: Array<DBVilla & { coverUrl: string | null }> = [];
  for (const pr of priorities) merged.push(...shuffle(groups.get(pr)!));

  return merged;
}

function VillaCardClickable({ v }: { v: DBVilla & { coverUrl: string | null } }) {
  const href = `${VILLA_DETAIL_PATH}/${v.id}`;
  return (
    <article className="relative rounded-xl overflow-hidden border bg-white group">
      {/* Tüm kartı tıklanabilir yapan overlay */}
      <Link href={href} className="absolute inset-0 z-10" aria-label={v.name} />
      <div className="aspect-[4/3] w-full bg-gray-100">
        {v.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.coverUrl}
            alt={v.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : null}
      </div>
      <div className="p-3">
        <h3 className="font-semibold line-clamp-1">{v.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {v.location ?? ""}{" "}
          {v.weekly_price ? `• ₺${Number(v.weekly_price).toLocaleString("tr-TR")}/hafta` : ""}
        </p>
      </div>
    </article>
  );
}

export default async function FeaturedVillas() {
  const villas = await fetchVillasWithCover();
  const featured = villas.slice(0, 10); // üstte 10 adet

  return (
    <section className="space-y-10">
      {/* Öne Çıkanlar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold">Öne Çıkan Villalar</h2>
          <Link href="#all" className="text-sm underline underline-offset-4">
            Tümünü gör
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="text-muted-foreground">Öne çıkarılacak villa bulunamadı.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {featured.map((v) => (
              <VillaCardClickable key={v.id} v={v} />
            ))}
          </div>
        )}
      </div>

      {/* Alt: Tüm Villalar */}
      <div id="all" className="space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold">Tüm Villalar</h2>
        {villas.length === 0 ? (
          <p className="text-muted-foreground">Henüz villa bulunmuyor.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {villas.map((v) => (
              <VillaCardClickable key={v.id} v={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
