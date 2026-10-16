"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { fetchMe } from "@/lib/api";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";

import { ChevronRightIcon, FlameIcon } from "@/components/icons/LobbyIcons";
import { APP_CHROME_BG } from "@/components/layout/AppChrome";
import { CategoryTile, type CategoryTileData } from "@/components/lobby/CategoryTile";
import { EarningsListRow, EarningsPodium } from "@/components/lobby/EarningsPodium";
import { GamePoster } from "@/components/lobby/GamePoster";
import { LobbyImage } from "@/components/lobby/LobbyImage";
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
  type GameCategorySlug,
  countForCategory,
} from "@/data/lobby-catalog";

const RUPEE = "\u20B9";

const banners = ["/banner/take1.png", "/banner/take2.png", "/banner/take3.png", "/banner/take4.png", "/banner/take5.png"];

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

const WINNING_FEED = [
  { id: "w1", user: "Mem***UQX", amount: "1,247.30", photo: "/faces/face-04.jpg" },
  { id: "w2", user: "Mem***QVU", amount: "892.15", photo: "/faces/face-05.jpg" },
  { id: "w3", user: "Mem***BPD", amount: "3,120.00", photo: "/faces/face-06.jpg" },
  { id: "w4", user: "Mem***YSL", amount: "556.90", photo: "/faces/face-07.jpg" },
  { id: "w5", user: "Mem***NUM", amount: "2,008.45", photo: "/faces/face-08.jpg" },
  { id: "w6", user: "Mem***GZG", amount: "764.20", photo: "/faces/face-09.jpg" },
  { id: "w7", user: "Mem***XMH", amount: "1,862.00", photo: "/faces/face-10.jpg" },
  { id: "w8", user: "Mem***JOS", amount: "4,600.00", photo: "/faces/face-no1.jpg" },
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
  const { user, ready } = useFirebaseUser();
  const [bonus, setBonus] = useState({ total: "0.00", today: "0.00" });
  const [notesOpen, setNotesOpen] = useState(false);
  const [readNotes, setReadNotes] = useState<string[]>([]);

  useEffect(() => {
    if (!ready || !user) return;
    let alive = true;
    void fetchMe()
      .then((res) => {
        if (!alive) return;
        const total = Number(res.profile.total_bonus ?? 0);
        const today = Number(res.profile.today_bonus ?? 0);
        setBonus({
          total: Number.isFinite(total) ? total.toFixed(2) : "0.00",
          today: Number.isFinite(today) ? today.toFixed(2) : "0.00",
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ready, user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aviator_notes_read");
      if (raw) setReadNotes(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setBannerIdx((i) => (i + 1) % banners.length);
    }, 2600);
    return () => clearInterval(t);
  }, []);

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
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden className="shrink-0">
                  <path fill="#ff3b30" d="M5 7.5h22v6.2H18.6V25h-6.4V13.7H5V7.5Z" />
                  <path fill="#ff6a45" d="M16.2 7.5h10.8L21.4 16H14.2L16.2 7.5Z" />
                </svg>
                <div className="min-w-0 text-[20px] font-extrabold leading-none tracking-tight text-[#ff3b30]">Tc Lottery</div>
              </div>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  setNotesOpen(true);
                  const ids = inboxNotes(bonus).map((n) => n.id);
                  setReadNotes(ids);
                  try {
                    localStorage.setItem("aviator_notes_read", JSON.stringify(ids));
                  } catch {
                    /* ignore */
                  }
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#ffe1dc] active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#ff4d45"
                    d="M12 3.2a1.35 1.35 0 0 0-1.32 1.1A5.15 5.15 0 0 0 6.2 9.4v4.15L4.7 15.7a.9.9 0 0 0 .68 1.5h13.24a.9.9 0 0 0 .68-1.5L18 13.55V9.4a5.15 5.15 0 0 0-4.48-5.1A1.35 1.35 0 0 0 12 3.2Z"
                  />
                  <path fill="#ff4d45" d="M9.7 18.2a2.3 2.3 0 0 0 4.6 0H9.7Z" />
                </svg>
                {inboxNotes(bonus).some((n) => !readNotes.includes(n.id)) ? (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#ff3b30] ring-2 ring-[#ffe1dc]" />
                ) : null}
              </button>
            </div>
          </div>

          {/* Content scroll area */}
          <div ref={contentRef} className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            {/* Hero: single slide + fade (no horizontal scroll) */}
            <div className="mt-3 px-4">
              <div className="relative aspect-[2.15/1] min-h-[112px] w-full overflow-hidden rounded-2xl ring-1 ring-black/5">
                {banners.map((src, i) => (
                  <LobbyImage
                    key={src}
                    src={src}
                    alt=""
                    fill
                    priority={i === 0}
                    sizes="430px"
                    className={[
                      "object-cover transition-opacity duration-500 ease-out",
                      i === bannerIdx ? "z-10 opacity-100" : "z-0 opacity-0",
                    ].join(" ")}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                {banners.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    aria-label={`Banner ${i + 1}`}
                    onClick={() => setBannerIdx(i)}
                    className={
                      i === bannerIdx ? "h-1.5 w-5 rounded-full bg-[#f95959]" : "h-1.5 w-1.5 rounded-full bg-zinc-300"
                    }
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
              <div className="h-[300px] overflow-hidden">
                <div className="win-ticker-track">
                  <WinningFeedRows />
                  <WinningFeedRows />
                </div>
              </div>
            </div>

            {/* Today's earnings chart */}
            <SectionTitle title="Today's earnings chart" />
            <div className="mt-3 px-4">
              <div className="rounded-[28px] bg-white px-3 pb-2 pt-5 shadow-sm ring-1 ring-zinc-100">
                <div className="flex items-end gap-2">
                  <EarningsPodium place="NO2" name="Him***hu" amount="3,657,262.49" tone="blue" photo="/faces/face-no2.jpg" />
                  <EarningsPodium place="NO1" name="Mem***JOS" amount="4,392,360.00" tone="rose" photo="/faces/face-no1.jpg" big />
                  <EarningsPodium place="NO3" name="dam***mes" amount="3,410,400.00" tone="orange" photo="/faces/face-no3.jpg" />
                </div>
              </div>
              <div className="mt-3 space-y-2.5">
                {[
                  ["Ru***sh", "2,992,642.20", "/faces/face-04.jpg"],
                  ["Mem***3MA", "2,810,854.84", "/faces/face-05.jpg"],
                  ["Mem***KIS", "2,439,894.26", "/faces/face-06.jpg"],
                  ["Mem***PDG", "2,387,435.80", "/faces/face-07.jpg"],
                  ["SUK***EET", "2,341,974.60", "/faces/face-08.jpg"],
                  ["Mem***UJE", "2,339,311.72", "/faces/face-09.jpg"],
                  ["Mem***MGI", "2,237,704.56", "/faces/face-10.jpg"],
                ].map(([name, amount, photo], i) => (
                  <EarningsListRow key={name} rank={i + 4} name={name} amount={amount} photo={photo} />
                ))}
              </div>
            </div>

            <div className="h-6" />
          </div>

          {notesOpen ? (
            <div className="absolute inset-0 z-30 bg-black/40" onClick={() => setNotesOpen(false)}>
              <div className="absolute top-16 right-3 left-3 max-h-[70%] overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                  <div className="text-[16px] font-semibold text-zinc-900">Notifications</div>
                  <button type="button" onClick={() => setNotesOpen(false)} className="text-sm text-zinc-500">Close</button>
                </div>
                <div className="no-scrollbar max-h-[420px] space-y-2 overflow-y-auto px-3 py-3">
                  {inboxNotes(bonus).map((note) => (
                    <div key={note.id} className="rounded-xl bg-zinc-50 px-3 py-3">
                      <div className="text-[14px] font-medium text-zinc-800">{note.title}</div>
                      <p className="mt-1 text-[13px] font-normal leading-5 text-zinc-500">{note.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Bottom tab bar */}
          <div className="shrink-0 border-t border-zinc-200/80 bg-white">
            <BottomTab />
          </div>
        </div>
      </div>
    </div>
  );
}


function inboxNotes(bonus: { total: string; today: string }) {
  return [
    {
      id: "welcome",
      title: "Welcome",
      body: "Your account is ready. Aviator, bonuses, and your invitation code are inside the app.",
    },
    {
      id: "bonus",
      title: "Your bonus",
      body: `Today's bonus is ₹${bonus.today}. Total bonus is ₹${bonus.total}. These amounts show on the Activity tab.`,
    },
    {
      id: "attendance",
      title: "Attendance",
      body: "Open Activity and claim ₹10 once each day. It adds to today's bonus and the total.",
    },
    {
      id: "gift",
      title: "Gift code",
      body: "WELCOME50 adds ₹50 once. Enter it under Gifts on the Activity tab.",
    },
  ];
}

function WinningFeedRows() {
  return (
    <div>
      {WINNING_FEED.map((w) => (
        <div key={w.id} className="mb-2 flex items-center gap-2.5 rounded-2xl bg-white px-2.5 py-2 shadow-sm ring-1 ring-zinc-100">
          <span
            className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center shadow-md ring-[3px] ring-white"
            style={{ backgroundImage: `url("${w.photo}")` }}
            role="img"
            aria-hidden
          />
          <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-500">{w.user}</div>
          <div className="shrink-0 text-right">
            <div className="text-[13px] font-semibold tabular-nums text-[#1aae5a]">
              Receive {RUPEE}
              {w.amount}
            </div>
            <div className="text-[11px] font-normal text-zinc-400">Winning amount</div>
          </div>
        </div>
      ))}
    </div>
  );
}

