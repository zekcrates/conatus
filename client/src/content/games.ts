export type GameCard = {
  id: string;
  title: string;
  meta: string;
  description: string;
  searchText: string;
  price: string;
  status: string;
  poster: "poster-stalingrad" | "poster-next" | "poster-lohhausen" | "poster-tanaland";
  href: string;
};

export const games: GameCard[] = [
  {
    id: "01",
    title: "Eastern Front",
    meta: "Eastern Front · 1941—43",
    description: "A browser game of distance, supply, and attrition.",
    searchText: "eastern front · 1941—43 a browser game of distance, supply, and attrition.",
    price: "Free",
    status: "Play now",
    poster: "poster-stalingrad",
    href: "/games/eastern-front",
  },
  {
    id: "02",
    title: "Estonia: A Little Country that Could",
    meta: "Estonia · 1992—94",
    description: "As Mart Laar, lead Estonia through the reforms that shaped its future.",
    searchText: "estonia · 1992—94 as mart laar, lead estonia through the reforms that shaped its future.",
    price: "—",
    status: "In development",
    poster: "poster-next",
    href: "/games/estonia-1992",
  },
  {
    id: "03",
    title: "Lohhausen 1981",
    meta: "Lohhausen · 1981—91",
    description: "Ten years as mayor of a town whose watch factory pays the wages.",
    searchText: "lohhausen · 1981—91 ten years as mayor of a town whose watch factory pays the wages.",
    price: "Free",
    status: "Play now",
    poster: "poster-lohhausen",
    href: "/games/lohhausen",
  },
  {
    id: "04",
    title: "Tanaland",
    meta: "Tanaland · Ten years",
    description: "Run a country's development for ten years, and find out how good intentions go wrong.",
    searchText: "tanaland · ten years run a country's development for ten years, and find out how good intentions go wrong.",
    price: "Free",
    status: "Play now",
    poster: "poster-tanaland",
    href: "/games/tanaland",
  },
];
