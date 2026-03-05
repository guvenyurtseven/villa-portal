import Link from "next/link";
import { CATEGORY_DEFS } from "@/lib/categories";

export default function CategoryNav() {
  return (
    <nav className="w-full mx-auto mb-6">
      {/* Yatay kaydırmalı tek satır */}
      <ul className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar snap-x">
        {CATEGORY_DEFS.map((c) => (
          <li key={c.slug} className="snap-start flex-shrink-0">
            <Link
              href={`/${c.slug}`}
              className="group inline-flex items-center justify-center gap-2
                         h-8 px-3 text-xs rounded-lg
                         bg-orange-500 hover:bg-orange-600 text-white text-center
                         shadow-sm hover:shadow-md transition
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500"
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
