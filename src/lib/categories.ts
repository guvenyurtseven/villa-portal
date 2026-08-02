export type CategoryDef = {
  name: string;
  slug: string;
  icon: string;
  coverImage: string;
};

export const CATEGORY_DEFS: CategoryDef[] = [
  {
    name: "Kiralık Villalar",
    slug: "kiralik-villalar",
    icon: "🏠",
    coverImage:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Balayı Villaları",
    slug: "balayi-villalari",
    icon: "❤",
    coverImage:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Muhafazakar Villalar",
    slug: "muhafazakar-villalar",
    icon: "🛡",
    coverImage:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Lüks Villalar",
    slug: "luks-villalar",
    icon: "💎",
    coverImage:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Ekonomik Villalar",
    slug: "ekonomik-kiralik-villalar",
    icon: "₺",
    coverImage:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Denize Yakın Villalar",
    slug: "denize-yakin-kiralik-villalar",
    icon: "🌊",
    coverImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
  },
];

export function getCategoryCoverImage(slug: string) {
  return CATEGORY_DEFS.find((category) => category.slug === slug)?.coverImage;
}
