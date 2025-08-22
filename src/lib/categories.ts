export type CategoryDef = {
  name: string;
  slug: string;
  icon: string; // ufak emoji ikon
};

export const CATEGORY_DEFS: CategoryDef[] = [
  { name: "Kiralık Villalar", slug: "kiralik-villalar", icon: "🏠" },
  { name: "Balayı Villaları", slug: "balayi-villalari", icon: "❤️" },
  { name: "Muhafazakar Villalar", slug: "muhafazakar-villalar", icon: "🛡️" },
  { name: "Lüks Villalar", slug: "luks-villalar", icon: "💎" },
  { name: "Ekonomik Kiralık Villalar", slug: "ekonomik-kiralik-villalar", icon: "💸" },
  { name: "Denize Yakın Kiralık Villalar", slug: "denize-yakin-kiralik-villalar", icon: "🌊" },
];
