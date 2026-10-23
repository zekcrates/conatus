export type GameCard = {
  id: string;
  title: string;
  meta: string;
  description: string;
  searchText: string;
  price: string;
  status: string;
  poster: "poster-stalingrad" | "poster-next";
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
    title: "Estonia 1992",
    meta: "Estonia · 1992—94",
    description: "As Mart Laar, lead Estonia through the reforms that shaped its future.",
    searchText: "estonia · 1992—94 as mart laar, lead estonia through the reforms that shaped its future.",
    price: "—",
    status: "In development",
    poster: "poster-next",
    href: "#",
  },
];
