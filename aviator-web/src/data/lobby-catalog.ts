/**
 * Single source for lobby “See all” + category grids.
 * Paths are stored with literal spaces — use encodePublicPath() for next/image src.
 */

export type BannerTone = "rose" | "violet" | "blue" | "orange" | "emerald";

export type GameCategorySlug =
  | "platform"
  | "popular"
  | "lottery"
  | "casino"
  | "slots"
  | "sports"
  | "rummy"
  | "fishing"
  | "original";

export const GAME_CATEGORY_SLUGS = [
  "platform",
  "popular",
  "lottery",
  "casino",
  "slots",
  "sports",
  "rummy",
  "fishing",
  "original",
] as const satisfies readonly GameCategorySlug[];

export function encodePublicPath(src: string): string {
  if (!src.startsWith("/")) return src;
  return (
    "/" +
    src
      .slice(1)
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")
  );
}

export function isGameCategorySlug(s: string): s is GameCategorySlug {
  return (GAME_CATEGORY_SLUGS as readonly string[]).includes(s);
}

export const CATEGORY_SECTION_TITLES: Record<GameCategorySlug, string> = {
  platform: "Platform recommendation",
  popular: "Popular",
  lottery: "Lottery",
  casino: "Casino",
  slots: "Slots",
  sports: "Sports",
  rummy: "Rummy",
  fishing: "Fishing",
  original: "Original",
};

/** Static paths under /public — human-readable; encode with encodePublicPath when passing to `<Image />` */
export const SECTION_LOTTERY: {
  id: string;
  title: string;
  img: string;
  gradient: string;
  href?: string;
}[] = [
  {
    id: "wingo",
    title: "Win Go",
    img: "/sections-image/lottary/wingoo.png",
    gradient: "from-[#ef4444] via-[#f97316] to-[#fb923c]",
    href: "/play/win-go",
  },
  {
    id: "moto",
    title: "MotoRace",
    img: "/sections-image/lottary/moto race.png",
    gradient: "from-[#ea580c] via-[#f97316] to-[#fbbf24]",
    href: "/play/motorace",
  },
  {
    id: "k3",
    title: "K3",
    img: "/sections-image/lottary/k3.png",
    gradient: "from-[#7c3aed] via-[#a855f7] to-[#e879f9]",
    href: "/play/k3",
  },
  {
    id: "5d",
    title: "5D",
    img: "/sections-image/lottary/5d.png",
    gradient: "from-[#0ea5e9] via-[#3b82f6] to-[#6366f1]",
    href: "/play/5d",
  },
  {
    id: "trx",
    title: "TRX Win Go",
    img: "/sections-image/lottary/trx win.png",
    gradient: "from-[#10b981] via-[#14b8a6] to-[#2dd4bf]",
    href: "/play/trx-win-go",
  },
];

export const SECTION_CASINO: { title: string; img: string; href?: string }[] = [
  { title: "1 Casino", img: "/sections-image/casino/1casion.png" , href: "/play/1-casino" },
  { title: "777 Roulette", img: "/sections-image/casino/777 roullet.png" , href: "/play/777-roulette" },
  { title: "American Roulette", img: "/sections-image/casino/american roullat.png" , href: "/play/american-roulette" },
  { title: "Auto Roulette", img: "/sections-image/casino/autoroullet.png" , href: "/play/auto-roulette" },
  { title: "Bacc Bo", img: "/sections-image/casino/bac bo.png" , href: "/play/bacc-bo" },
  { title: "Super Andar Bahar", img: "/sections-image/casino/super andar bahar.png" , href: "/play/super-andar-bahar" },
];

export const SECTION_SLOTS: { title: string; img: string; href?: string }[] = [
  { title: "Evolution", img: "/sections-image/slot/evolution.png" , href: "/play/evolution" },
  { title: "JDB Game", img: "/sections-image/slot/jdb game.png" , href: "/play/jdb-game" },
  { title: "JILI Game", img: "/sections-image/slot/jiligame.png" , href: "/play/jili-game" },
  { title: "M Game", img: "/sections-image/slot/mgame.png" , href: "/play/m-game" },
  { title: "M Game+", img: "/sections-image/slot/mmmmgame.png" , href: "/play/m-game" },
  { title: "PG Game", img: "/sections-image/slot/pg game.png" , href: "/play/pg-game" },
];

export const SECTION_SPORTS: { title: string; img: string; href?: string }[] = [
  { title: "9 Sport", img: "/sections-image/sport/9sport.png" , href: "/play/9-sport" },
  { title: "CMD Sport", img: "/sections-image/sport/cmd sport.png" , href: "/play/cmd-sport" },
  { title: "NA Sport", img: "/sections-image/sport/na sport.png" , href: "/play/na-sport" },
  { title: "SA Sport", img: "/sections-image/sport/sa sport.png" , href: "/play/sa-sport" },
];

export const SECTION_FISHING: { title: string; img: string; href?: string }[] = [
  { title: "Booming Fish", img: "/sections-image/fising/booming fish.png" , href: "/play/booming-fish" },
  { title: "Dynasor Tycons", img: "/sections-image/fising/dynasor tycons.png" , href: "/play/dynasor-tycons" },
  { title: "Happy Fishing", img: "/sections-image/fising/happy fising.png" , href: "/play/happy-fishing" },
  { title: "Jackpot Fishing", img: "/sections-image/fising/jackpot fising.png" , href: "/play/jackpot-fishing" },
  { title: "Mega Fishing", img: "/sections-image/fising/mega fishing.png" , href: "/play/mega-fishing" },
  { title: "Royal Fishing", img: "/sections-image/fising/royal fishing.png" , href: "/play/royal-fishing" },
];

export const SECTION_RUMMY: { title: string; img: string; href?: string }[] = [
  { title: "365 Rummy", img: "/sections-image/rummmy/365 rummy.png" , href: "/play/365-rummy" },
  { title: "Kublate", img: "/sections-image/rummmy/kublate.png" , href: "/play/kublate" },
  { title: "Poker", img: "/sections-image/rummmy/pocker.png" , href: "/play/poker" },
];

export type PlatformGameRow = {
  title: string;
  rtp: string;
  img: string;
  href?: string;
};

export const PLATFORM_GAMES: PlatformGameRow[] = [
  { title: "AVIATOR", rtp: "96.40%", img: "/platformrecomand/aviator.jpeg", href: "/game" },
  { title: "WINGO", rtp: "97.10%", img: "/platformrecomand/WinGo_30S_20250816142946827.png" , href: "/play/wingo" },
  { title: "VORTEX", rtp: "97.10%", img: "/platformrecomand/vertex.png" , href: "/play/vortex" },
  { title: "CHICKEN ROAD", rtp: "97.10%", img: "/platformrecomand/chiken road.png" , href: "/play/chicken-road" },
  { title: "MONEY COMING", rtp: "97.10%", img: "/platformrecomand/moniey coming.png" , href: "/play/money-coming" },
  { title: "AVIATOR+", rtp: "96.40%", img: "/platformrecomand/aviator.jpeg", href: "/game" },
];

export const SECTION_POPULAR: PlatformGameRow[] = [
  { title: "AVIATOR", rtp: "96.40%", img: "/platformrecomand/aviator.jpeg", href: "/game" },
  { title: "VORTEX", rtp: "97.10%", img: "/platformrecomand/vertex.png" , href: "/play/vortex" },
  { title: "WINGO", rtp: "97.10%", img: "/platformrecomand/WinGo_30S_20250816142946827.png" , href: "/play/wingo" },
  { title: "JILI GAME", rtp: "97.00%", img: "/sections-image/slot/jiligame.png" , href: "/play/jili-game" },
  { title: "CHICKEN ROAD", rtp: "97.10%", img: "/platformrecomand/chiken road.png" , href: "/play/chicken-road" },
  { title: "EVOLUTION", rtp: "96.80%", img: "/sections-image/slot/evolution.png" , href: "/play/evolution" },
];

export const SECTION_ORIGINAL: PlatformGameRow[] = [
  { title: "AVIATOR", rtp: "96.40%", img: "/platformrecomand/aviator.jpeg", href: "/game" },
  { title: "VORTEX", rtp: "97.10%", img: "/platformrecomand/vertex.png" , href: "/play/vortex" },
];

export function toneGradientClass(tone: BannerTone): string {
  switch (tone) {
    case "rose":
      return "from-rose-500 to-orange-400";
    case "violet":
      return "from-violet-600 to-fuchsia-500";
    case "blue":
      return "from-sky-500 to-indigo-500";
    case "orange":
      return "from-orange-500 to-amber-400";
    case "emerald":
      return "from-emerald-500 to-teal-400";
  }
}

export function countForCategory(slug: GameCategorySlug): number {
  switch (slug) {
    case "platform":
      return PLATFORM_GAMES.length;
    case "popular":
      return SECTION_POPULAR.length;
    case "lottery":
      return SECTION_LOTTERY.length;
    case "casino":
      return SECTION_CASINO.length;
    case "slots":
      return SECTION_SLOTS.length;
    case "sports":
      return SECTION_SPORTS.length;
    case "rummy":
      return SECTION_RUMMY.length;
    case "fishing":
      return SECTION_FISHING.length;
    case "original":
      return SECTION_ORIGINAL.length;
  }
}
