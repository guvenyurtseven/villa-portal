import { notFound } from "next/navigation";
import Image from "next/image";
import { createServiceRoleClient } from "@/lib/supabase/server";
import CategoryNav from "@/components/site/CategoryNav";
import VillaCard from "@/components/site/VillaCard";

type PhotoRow = {
  villa_id: string;
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

type VillaRow = {
  id: string;
  name: string;
  weekly_price: number | null;
  priority: number | null;
  is_hidden: boolean | null;
  villa_photos: PhotoRow[];
  villa_categories: { category_id: string }[];
};

interface Props {
  params: { kategoriSlug: string } | Promise<{ kategoriSlug: string }>;
  searchParams: { page?: string } | Promise<{ page?: string }>;
}

export const dynamic = "force-dynamic";

export default async function CategoryPage(props: Props) {
  const { kategoriSlug } = await Promise.resolve(props.params);
  const sp = await Promise.resolve(props.searchParams);
  const pageParam = (sp?.page ?? "1") as string;

  const supabase = createServiceRoleClient();

  // Kategori
  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, cover_image")
    .eq("slug", kategoriSlug)
    .single();

  if (!category) return notFound();

  // Sayfalama
  const pageSize = 12;
  const page = Math.max(parseInt(pageParam, 10) || 1, 1);
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // Villalar + fotoğraflar
  const { data: villas, count } = await supabase
    .from("villas")
    .select(
      "id, name, weekly_price, priority, is_hidden, villa_categories!inner(category_id), villa_photos(villa_id, url, is_primary, order_index)",
      { count: "exact" },
    )
    .eq("is_hidden", false)
    .eq("villa_categories.category_id", category.id)
    .order("priority", { ascending: false })
    .order("id", { ascending: false })
    .range(start, end);

  const list = (villas ?? []).map((v: VillaRow) => {
    // Foto dizisi: önce kapaklar, sonra order_index
    const sorted = (v.villa_photos || [])
      .slice()
      .sort((a, b) => {
        const ap = a.is_primary ? 0 : 1;
        const bp = b.is_primary ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (a.order_index ?? 999) - (b.order_index ?? 999);
      })
      .map((p) => p.url);
    const images = sorted.slice(0, 8); // kartta en fazla 8 foto

    return {
      id: v.id,
      name: v.name,
      weeklyPrice: v.weekly_price,
      images,
    };
  });

  const total = count ?? list.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <CategoryNav />

      {/* Kapak */}
      <section className="relative w-full h-52 sm:h-64 lg:h-72 overflow-hidden rounded-xl">
        <Image
          src={category.cover_image || "/kategori-placeholder.jpg"}
          alt={category.name}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-white text-3xl sm:text-4xl font-semibold drop-shadow">
            {category.name}
          </h1>
        </div>
      </section>

      {/* Grid */}
      {list.length === 0 ? (
        <p className="text-center text-muted-foreground">Bu kategoriye ait villa bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((v) => (
            <VillaCard
              key={v.id}
              id={v.id}
              name={v.name}
              weeklyPrice={v.weeklyPrice}
              images={v.images}
            />
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
    <nav className="flex items-center justify-center gap-1 select-none">
      <PageLink href={`${basePath}?page=${Math.max(1, page - 1)}`} disabled={page === 1}>
        ‹
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
        ›
      </PageLink>
    </nav>
  );
}

import Link from "next/link";
function PageLink({
  href,
  children,
  active,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="min-w-8 h-8 px-2 inline-flex items-center justify-center rounded border text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`min-w-8 h-8 px-2 inline-flex items-center justify-center rounded border
        ${active ? "bg-orange-500 border-orange-500 text-white" : "hover:bg-muted"}
      `}
    >
      {children}
    </Link>
  );
}
