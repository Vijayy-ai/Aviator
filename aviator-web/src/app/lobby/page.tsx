"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronRightIcon, FlameIcon } from "@/components/icons/LobbyIcons";
import { APP_CHROME_BG } from "@/components/layout/AppChrome";
import { CategoryTile, type CategoryTileData } from "@/components/lobby/CategoryTile";
import { EarningsListRow, EarningsPodium } from "@/components/lobby/EarningsPodium";
import { GamePoster } from "@/components/lobby/GamePoster";
import { LotteryRowCard } from "@/components/lobby/LotteryRowCard";
import { BottomTab } from "@/components/nav/BottomTab";
import {
  PLATFORM_GAMES,
  SECTION_CASINO,
  SECTION_FISHING,
  SECTION_LOTTERY,
  SECTION_ORIGINAL,
  SECTION_POPULAR,
  SECTION_RUMMY,
  SECTION_SLOTS,
  SECTION_SPORTS,
  toneGradientClass,
  type GameCategorySlug,
  countForCategory,
  type BannerTone,
} from "@/data/lobby-catalog";

const RUPEE = "\u20B9";

type Banner = { id: string; title: string; subtitle: string; tone: BannerTone };
const banners: Banner[] = [
  { id: "b1", title: "Daily Check-In", subtitle: "Recharge & claim reward", tone: "violet" },
  { id: "b2", title: "VIP Rewards", subtitle: "More level, more benefits", tone: "rose" },
  { id: "b3", title: "Hot Games", subtitle: "Top picks for you", tone: "blue" },
  { id: "b4", title: "Lucky Bonus", subtitle: "Limited time events", tone: "orange" },
  { id: "b5", title: "Safe & Secure", subtitle: "Fast deposit/withdraw", tone: "emerald" },
];

const quickCats: CategoryTileData[] = [
  {
    id: "popular",
    title: "Popular",
    iconSrc: "/popular/popular.png",
    gradient: "from-[#3b6ff0] via-[#4f84f7] to-[#7eb4ff]",
    labelAlign: "bottom-right",
  },
  {
    id: "lottery",
    title: "Lottery",
    iconSrc: "/lottery/lottary.png",
    gradient: "from-[#8b4fd9] via-[#a855c7] to-[#ec4899]",
    labelAlign: "bottom-right",
  },
  {
    id: "casino",
    title: "Casino",
    iconSrc: "/cassino/cassino.png",
    gradient: "from-[#e11d6f] via-[#f43f7a] to-[#fb7185]",
    labelAlign: "top-right",
  },
  {
    id: "slots",
    title: "Slots",
    iconSrc: "/slots/slots.png",
    gradient: "from-[#7c6cf0] via-[#9b87f5] to-[#c4b5fd]",
    labelAlign: "top-right",
  },
  {
    id: "sports",
    title: "Sports",
    iconSrc: "/sports/sportss.png",
    gradient: "from-[#f97316] via-[#fb923c] to-[#facc15]",
    labelAlign: "top-right",
  },
  {
    id: "rummy",
    title: "Rummy",
    iconSrc: "/rummy/rummyyyyy.png",
    gradient: "from-[#2563eb] via-[#4f46e5] to-[#7c3aed]",
    labelAlign: "bottom-right",
  },
  {
    id: "fishing",
    title: "Fishing",
    iconSrc: "/fising/fising.png",
    gradient: "from-[#f43f5e] via-[#fb7185] to-[#fb923c]",
    labelAlign: "bottom-right",
  },
  {
    id: "original",
    title: "Original",
    iconSrc: "/origional/gamecategory_20240412114937mcis.png",
    gradient: "from-[#38bdf8] via-[#60a5fa] to-[#93c5fd]",
    labelAlign: "bottom-right",
  },
];

type SectionId =
  | "popular"
  | "lottery"
  | "casino"
  | "slots"
  | "sports"
  | "rummy"
  | "fishing"
  | "original"
  | "platform";

const WINNING_FEED_SEED = [
  { id: "seed-1", user: "Mem***UQX", amount: "1,247.30" },
  { id: "seed-2", user: "Mem***QVU", amount: "892.15" },
  { id: "seed-3", user: "Mem***BPD", amount: "3,120.00" },
  { id: "seed-4", user: "Mem***YSL", amount: "556.90" },
  { id: "seed-5", user: "Mem***NUM", amount: "2,008.45" },
  { id: "seed-6", user: "Mem***GZG", amount: "764.20" },
];

function SectionTitle({
  title,
  right,
  accent = "gradient",
}: {
  title: string;
  right?: React.ReactNode;
  accent?: "gradient" | "rose";
}) {
  return (
    <div className="mt-5 flex min-w-0 items-center justify-between gap-2 px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {accent === "rose" ? (
          <span className="h-5 w-1.5 shrink-0 rounded-full bg-rose-600" />
        ) : (
          <span className="h-5 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-rose-500 to-orange-400" />
        )}
        <h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2>
      </div>
      {right ? <div className="shrink-0 text-sm text-zinc-500">{right}</div> : null}
    </div>
  );
}

function SeeAllLink({ category, n }: { category: GameCategorySlug; n: number }) {
  return (
    <Link
      href={`/games/${category}`}
      className="inline-flex items-center gap-1 rounded-full border border-zinc-200/90 bg-white px-3.5 py-1.5 text-sm font-semibold text-zinc-600 shadow-sm transition active:scale-[0.98]"
    >
      All {n}
      <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
    </Link>
  );
}

function PlatformTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="mt-5 flex min-w-0 items-center justify-between gap-2 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-sm"
          aria-hidden
        >
          <FlameIcon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export default function LobbyPage() {
  const [bannerIdx, setBannerIdx] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setBannerIdx((i) => (i + 1) % banners.length);
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const winningFeed = useWinningFeed();

  const sectionTopById = useMemo(() => {
    return {
      popular: "section-popular",
      lottery: "section-lottery",
      casino: "section-casino",
      slots: "section-slots",
      sports: "section-sports",
      rummy: "section-rummy",
      fishing: "section-fishing",
      original: "section-original",
      platform: "section-platform",
    } satisfies Record<SectionId, string>;
  }, []);

  function scrollToSection(id: SectionId) {
    const root = contentRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`#${sectionTopById[id]}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={["h-dvh w-full overflow-hidden text-zinc-950", APP_CHROME_BG].join(" ")}>
      <div className="mx-auto h-full w-full max-w-[430px] min-w-0">
        <div className="relative flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden bg-zinc-50 sm:rounded-[28px] sm:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.35)] sm:ring-1 sm:ring-zinc-200">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-zinc-100/80 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 shadow-sm ring-1 ring-white/30" />
                <div className="min-w-0 leading-tight">
                  <div className="text-base font-bold tracking-tight">Aviator</div>
                  <div className="text-xs font-medium text-zinc-500">Mobile-first web</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button className="h-10 w-10 rounded-2xl bg-zinc-100 ring-1 ring-zinc-200/80" type="button" aria-label="Notifications" />
                <button className="h-10 w-10 rounded-2xl bg-zinc-100 ring-1 ring-zinc-200/80" type="button" aria-label="Menu" />
              </div>
            </div>
          </div>

          {/* Content scroll area */}
          <div ref={contentRef} className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            {/* Hero: single slide + fade (no horizontal scroll) */}
            <div className="mt-3 px-4">
              <div className="relative aspect-[16/9] min-h-[148px] w-full overflow-hidden rounded-3xl ring-1 ring-black/5">
                {banners.map((b, i) => (
                  <div
                    key={b.id}
                    className={[
                      "absolute inset-0 border border-white/35 bg-gradient-to-r transition-opacity duration-500 ease-out",
                      toneGradientClass(b.tone),
                      i === bannerIdx ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none",
                    ].join(" ")}
                  >
                    <div className="flex h-full flex-col justify-center px-5 py-5 text-white sm:px-6 sm:py-6">
                      <div className="text-sm font-semibold text-white/95">Daman style lobby</div>
                      <div className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.65rem]">{b.title}</div>
                      <div className="mt-1.5 text-base font-medium leading-snug text-white/95">{b.subtitle}</div>
                      <div className="mt-4 inline-flex h-10 items-center rounded-full bg-white/20 px-5 text-sm font-bold shadow-sm backdrop-blur-sm">
                        Detail
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-center gap-2">
                {banners.map((_, i) => (
                  <span
                    key={i}
                    className={[
                      "h-2 rounded-full transition-all duration-300",
                      i === bannerIdx ? "w-7 bg-rose-500" : "w-2 bg-zinc-300",
                    ].join(" ")}
                  />
                ))}
              </div>
            </div>

            {/* Quick categories */}
            <div className="mt-4 min-w-0 px-3">
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  {quickCats.slice(0, 2).map((c) => (
                    <CategoryTile
                      key={c.id}
                      tile={c}
                      size="large"
                      priority
                      onSelect={() => scrollToSection(c.id as SectionId)}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {quickCats.slice(2, 5).map((c) => (
                    <CategoryTile
                      key={c.id}
                      tile={c}
                      size="small"
                      onSelect={() => scrollToSection(c.id as SectionId)}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {quickCats.slice(5, 8).map((c) => (
                    <CategoryTile
                      key={c.id}
                      tile={c}
                      size="small"
                      onSelect={() => scrollToSection(c.id as SectionId)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Platform recommendation */}
            <div id="section-platform" />
            <PlatformTitle title="Platform recommendation" right={<SeeAllLink category="platform" n={countForCategory("platform")} />} />
            <div className="mt-3 min-w-0 px-4">
              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {PLATFORM_GAMES.map((g, i) => (
                  <GamePoster
                    key={g.title}
                    href={g.href}
                    title={g.title}
                    rtp={g.rtp}
                    img={g.img}
                    priority={i === 0}
                  />
                ))}
              </div>
            </div>

            {/* Popular */}
            <div id="section-popular" />
            <SectionTitle title="Popular" right={<SeeAllLink category="popular" n={countForCategory("popular")} />} />
            <div className="mt-3 min-w-0 px-4">
              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {SECTION_POPULAR.map((g) => (
                  <GamePoster key={g.title} href={g.href} title={g.title} rtp={g.rtp} img={g.img} />
                ))}
              </div>
            </div>

            {/* Lottery: 2 + 3 grid */}
            <div id="section-lottery" />
            <SectionTitle accent="rose" title="Lottery" right={<SeeAllLink category="lottery" n={countForCategory("lottery")} />} />
            <div className="mt-3 min-w-0 space-y-2.5 px-4">
              <div className="grid min-w-0 grid-cols-2 gap-2.5">
                {SECTION_LOTTERY.slice(0, 2).map((c) => (
                  <LotteryRowCard key={c.id} item={c} size="large" />
                ))}
              </div>
              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {SECTION_LOTTERY.slice(2, 5).map((c) => (
                  <LotteryRowCard key={c.id} item={c} size="compact" />
                ))}
              </div>
            </div>

            {/* Casino */}
            <div id="section-casino" />
            <SectionTitle title="Casino" right={<SeeAllLink category="casino" n={countForCategory("casino")} />} />
            <div className="mt-3 min-w-0 px-4">
              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {SECTION_CASINO.map((g) => (
                  <GamePoster key={g.title} href={g.href} title={g.title} img={g.img} />
                ))}
              </div>
            </div>

            {/* Slots */}
            <div id="section-slots" />
            <SectionTitle title="Slots" right={<SeeAllLink category="slots" n={countForCategory("slots")} />} />
            <div className="mt-3 min-w-0 px-4">
              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {SECTION_SLOTS.map((g) => (
                  <GamePoster key={g.title} href={g.href} title={g.title} img={g.img} />
                ))}
              </div>
            </div>

            {/* Sports */}
            <div id="section-sports" />
            <SectionTitle title="Sports" right={<SeeAllLink category="sports" n={countForCategory("sports")} />} />
            <div className="mt-3 min-w-0 px-4">
              <div className="grid min-w-0 grid-cols-2 gap-2.5">
                {SECTION_SPORTS.map((g) => (
                  <GamePoster key={g.title} href={g.href} title={g.title} img={g.img} />
                ))}
              </div>
            </div>

            {/* Rummy */}
            <div id="section-rummy" />
            <SectionTitle title="Rummy" right={<SeeAllLink category="rummy" n={countForCategory("rummy")} />} />
            <div className="mt-3 min-w-0 px-4">
              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {SECTION_RUMMY.map((g) => (
                  <GamePoster key={g.title} href={g.href} title={g.title} img={g.img} />
                ))}
              </div>
            </div>

            {/* Fishing */}
            <div id="section-fishing" />
            <SectionTitle title="Fishing" right={<SeeAllLink category="fishing" n={countForCategory("fishing")} />} />
            <div className="mt-3 min-w-0 px-4">
              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {SECTION_FISHING.map((g) => (
                  <GamePoster key={g.title} href={g.href} title={g.title} img={g.img} />
                ))}
              </div>
            </div>

            {/* Original */}
            <div id="section-original" />
            <SectionTitle title="Original" right={<SeeAllLink category="original" n={countForCategory("original")} />} />
            <div className="mt-3 px-4">
              <div className="grid min-w-0 grid-cols-2 gap-2.5">
                {SECTION_ORIGINAL.map((g) => (
                  <GamePoster key={g.title} href={g.href} title={g.title} rtp={g.rtp} img={g.img} />
                ))}
              </div>
            </div>

            {/* Winning information */}
            <SectionTitle title="Winning information" />
            <div className="mt-3 px-4">
              <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
                <div className="space-y-2">
                  {winningFeed.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-2xl bg-zinc-50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-r from-rose-200 to-orange-200" />
                        <div className="min-w-0 text-sm font-bold tracking-tight text-zinc-800">{w.user}</div>
                      </div>
                      <div className="shrink-0 pl-2 text-sm font-bold tabular-nums text-zinc-900">
                        Receive {RUPEE}
                        {w.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today's earnings chart */}
            <SectionTitle title="Today's earnings chart" />
            <div className="mt-3 px-4">
              <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
                <div className="grid grid-cols-3 gap-2">
                  <EarningsPodium place="NO2" name="Mem***FVT" amount="11,038,800.00" tone="blue" />
                  <EarningsPodium place="NO1" name="Pr***n" amount="13,735,170.08" tone="rose" big />
                  <EarningsPodium place="NO3" name="Mem***4EV" amount="9,187,454.34" tone="orange" />
                </div>

                <div className="mt-4 space-y-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <EarningsListRow
                      key={i}
                      rank={i + 4}
                      name={`Mem***${String.fromCharCode(65 + i)}${String.fromCharCode(67 + i)}`}
                      amount={6_000_000 - i * 420_000}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="h-6" />
          </div>

          {/* Bottom tab bar */}
          <div className="shrink-0 border-t border-zinc-200/80 bg-white">
            <BottomTab />
          </div>
        </div>
      </div>
    </div>
  );
}


function useWinningFeed() {
  const [items, setItems] = useState(WINNING_FEED_SEED);
  useEffect(() => {
    const t = setInterval(() => {
      setItems((prev) => {
        const next = [randomWinning(), ...prev];
        return next.slice(0, 6);
      });
    }, 1800);
    return () => clearInterval(t);
  }, []);
  return items;
}

function randomWinning() {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const users = ["Mem***UQX", "Mem***QVU", "Mem***BPD", "Mem***GZG", "Mem***YSL", "Mem***XMH", "Mem***NUM"];
  const user = users[Math.floor(Math.random() * users.length)]!;
  const amount = (Math.floor(Math.random() * 4800) + 120).toFixed(2);
  return { id, user, amount };
}

