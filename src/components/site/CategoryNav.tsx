import Link from "next/link";
import { CATEGORY_DEFS } from "@/lib/categories";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CategoryNav() {
  return (
    <nav className="mx-auto mb-6 w-full">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CATEGORY_DEFS.map((category) => (
          <li key={category.slug} className="min-w-0">
            <Link
              href={`/${category.slug}`}
              className={cn(
                buttonVariants({ variant: "primary", size: "sm" }),
                "group min-h-10 w-full rounded-lg px-3 text-center text-xs shadow-sm hover:shadow-md",
              )}
            >
              <span className="text-sm">{category.icon}</span>
              <span className="truncate text-[11px] font-semibold uppercase tracking-wider opacity-90 group-hover:opacity-100">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
