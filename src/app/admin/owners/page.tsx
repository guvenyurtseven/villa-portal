// src/app/admin/owners/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { OwnerCard } from "@/components/admin/OwnerCard";

type SearchParams = Record<string, string | string[] | undefined>;

type Owner = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  villa_ids?: string[];
};

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>; // Next 15: async Dynamic API
}) {
  // 1) Yetki kontrolü (sayfa seviyesinde)
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") {
    redirect("/admin-login");
  }

  // 2) Arama & sayfalama parametreleri
  const sp = await searchParams;
  const q = (sp.q ?? "").toString().trim();
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(sp.pageSize ?? 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 3) Supabase (server role) ile doğrudan veri çek
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("owners_with_villas")
    .select("*", { count: "exact" })
    .order("full_name", { ascending: true })
    .range(from, to);

  if (q) {
    // ad/e-posta/telefon üzerinde arama
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <SearchBar defaultQuery={q} />
        <div className="rounded-md border p-6 text-sm text-red-600">
          Liste alınamadı: {error.message}
        </div>
      </div>
    );
  }

  const items = (data ?? []) as Owner[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <Header />
      <SearchBar defaultQuery={q} />

      {items.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          {q ? (
            <>“{q}” için sonuç yok.</>
          ) : (
            <>Henüz sahip eklenmemiş. Sağ üstten “Yeni Sahip” oluşturabilirsiniz.</>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((o) => (
            <OwnerCard key={o.id} owner={o} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} q={q} pageSize={pageSize} />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Sahipler</h1>
      <Link
        href="/admin/owners/new"
        className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
      >
        Yeni Sahip
      </Link>
    </div>
  );
}

function SearchBar({ defaultQuery }: { defaultQuery?: string }) {
  // Basit GET formu; App Router searchParams'a göre yeniden veri çeker
  return (
    <form className="flex items-center gap-2" action="/admin/owners" method="get">
      <input
        type="text"
        name="q"
        defaultValue={defaultQuery}
        placeholder="İsim, e-posta veya telefon ara…"
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
        Ara
      </button>
    </form>
  );
}

function Pagination({
  page,
  totalPages,
  q,
  pageSize,
}: {
  page: number;
  totalPages: number;
  q?: string;
  pageSize: number;
}) {
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const base = "/admin/owners";
  const mk = (p: number) =>
    `${base}?page=${p}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="flex items-center justify-between pt-2 text-sm">
      <div className="text-muted-foreground">
        Sayfa {page} / {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={mk(prev)}
          className="rounded-md border px-3 py-1.5 hover:bg-muted"
          aria-disabled={page <= 1}
        >
          Önceki
        </Link>
        <Link
          href={mk(next)}
          className="rounded-md border px-3 py-1.5 hover:bg-muted"
          aria-disabled={page >= totalPages}
        >
          Sonraki
        </Link>
      </div>
    </div>
  );
}
