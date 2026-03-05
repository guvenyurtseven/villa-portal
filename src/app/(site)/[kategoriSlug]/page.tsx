import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import CategoryNav from "@/components/site/CategoryNav";
import VillaCard from "@/components/site/VillaCard";
import { createServiceRoleClient } from "@/lib/supabase/server";

type PhotoRow = {
  villa_id: string;
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

type VillaRow = {
  id: string;
  name: string;
  capacity: number | null;
  priority: number | null;
  is_hidden: boolean | null;
  villa_photos: PhotoRow[];
  villa_categories: { category_id: string }[];
};

type PageProps = {
  params: Promise<{ kategoriSlug: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { kategoriSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const pageParam = resolvedSearchParams?.page ?? "1";

  const supabase = createServiceRoleClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, cover_image")
    .eq("slug", kategoriSlug)
    .single();

  if (!category) return notFound();

  const pageSize = 12;
  const page = Math.max(parseInt(pageParam, 10) || 1, 1);
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data: villas, count } = await supabase
    .from("villas")
    .select(
      "id, name, capacity, priority, is_hidden, villa_categories!inner(category_id), villa_photos(villa_id, url, is_primary, order_index)",
      { count: "exact" },
    )
    .eq("is_hidden", false)
    .eq("villa_categories.category_id", category.id)
    .order("priority", { ascending: false })
    .order("id", { ascending: false })
    .range(start, end);

  const list = (villas ?? []).map((v: VillaRow) => {
    const sorted = (v.villa_photos || [])
      .slice()
      .sort((a, b) => {
        const ap = a.is_primary ? 0 : 1;
        const bp = b.is_primary ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (a.order_index ?? 999) - (b.order_index ?? 999);
      })
      .map((p) => p.url);

    return {
      id: v.id,
      name: v.name,
      capacity: v.capacity ?? undefined,
      images: sorted.slice(0, 8),
    };
  });

  const total = count ?? list.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <CategoryNav />

      <section className="relative h-52 w-full overflow-hidden rounded-xl sm:h-64 lg:h-72">
        <Image
          src={category.cover_image || "/kategori-placeholder.jpg"}
          alt={category.name}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-semibold text-white drop-shadow sm:text-4xl">{category.name}</h1>
        </div>
      </section>

      {list.length === 0 ? (
        <p className="text-center text-muted-foreground">Bu kategoriye ait villa bulunamadi.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((v) => (
            <VillaCard key={v.id} id={v.id} name={v.name} capacity={v.capacity} images={v.images} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination basePath={`/${category.slug}`} page={page} totalPages={totalPages} />
      )}
    </main>
  );
}

function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="select-none flex items-center justify-center gap-1">
      <PageLink href={`${basePath}?page=${Math.max(1, page - 1)}`} disabled={page === 1}>
        {"<"}
      </PageLink>
      {pages.map((p) => (
        <PageLink key={p} href={`${basePath}?page=${p}`} active={p === page}>
          {p}
        </PageLink>
      ))}
      <PageLink
        href={`${basePath}?page=${Math.min(totalPages, page + 1)}`}
        disabled={page === totalPages}
      >
        {">"}
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 ${
        active ? "border-orange-500 bg-orange-500 text-white" : "hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}
