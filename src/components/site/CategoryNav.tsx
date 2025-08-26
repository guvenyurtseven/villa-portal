import Link from "next/link";
import { CATEGORY_DEFS } from "@/lib/categories";

export default function CategoryNav() {
  return (
    <nav className="w-full mx-auto mb-6">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {CATEGORY_DEFS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/${c.slug}`}
              className="group block rounded-lg bg-[#1f2a44] text-white px-3 py-4 text-center shadow-sm hover:shadow-md transition
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f2a44]"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{c.icon}</span>
                <span className="text-[11px] tracking-wider font-semibold uppercase opacity-90 group-hover:opacity-100">
                  {c.name}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
