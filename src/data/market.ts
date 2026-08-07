import type { MarketItem } from "../types";

export const MARKET_ITEMS: MarketItem[] = [
  {
    id: "frame-emerald",
    name: "Emerald Avatar Ring",
    description: "A smart emerald ring around your profile picture.",
    price: 30,
    icon: "💍",
    kind: "frame",
  },
  {
    id: "frame-sunset",
    name: "Sunset Avatar Ring",
    description: "A warm sunset-coloured ring that pops on dark mode.",
    price: 60,
    icon: "🌅",
    kind: "frame",
  },
  {
    id: "frame-gold",
    name: "Gold Avatar Ring",
    description: "The premium gold ring — flex on the leaderboard.",
    price: 120,
    icon: "👑",
    kind: "frame",
  },
  {
    id: "design-ocean",
    name: "Ocean Card Design",
    description: "Deep blue card skin with cyan accents.",
    price: 60,
    icon: "🌊",
    kind: "card_design",
  },
  {
    id: "design-sunset",
    name: "Sunset Card Design",
    description: "Orange-to-pink gradient card skin.",
    price: 80,
    icon: "🌇",
    kind: "card_design",
  },
  {
    id: "design-midnight",
    name: "Midnight Card Design",
    description: "Mysterious violet card skin.",
    price: 150,
    icon: "🌙",
    kind: "card_design",
  },
  {
    id: "badge-quizmaster",
    name: "Quiz Master Badge",
    description: "Earned flair that shows you live for quizzes.",
    price: 200,
    icon: "🏆",
    kind: "badge",
  },
  {
    id: "badge-perfect",
    name: "Perfect 10 Badge",
    description: "For perfectionists — display it on your profile.",
    price: 250,
    icon: "🎯",
    kind: "badge",
  },
];

export const marketItemById = (id: string): MarketItem | undefined =>
  MARKET_ITEMS.find((item) => item.id === id);
