import Link from "next/link";
import { CATEGORY_DEFS } from "@/lib/categories";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CategoryNav() {
  return (
    <nav className="w-full mx-auto mb-6">
      {/* Yatay kaydırmalı tek satır */}
      <ul className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar snap-x">
        {CATEGORY_DEFS.map((c) => (
          <li key={c.slug} className="snap-start flex-shrink-0">
            <Link
              href={`/${c.slug}`}
              className={cn(
                buttonVariants({ variant: "primary", size: "sm" }),
                "group rounded-lg text-center text-xs shadow-sm hover:shadow-md",
              )}
            >
              <span className="text-sm">{c.icon}</span>
              <span className="text-[11px] tracking-wider font-semibold uppercase opacity-90 group-hover:opacity-100">
                {c.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
