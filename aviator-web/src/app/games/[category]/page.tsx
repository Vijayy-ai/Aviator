import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { GamePoster } from "@/components/lobby/GamePoster";
import { LotteryRowCard } from "@/components/lobby/LotteryRowCard";
import {
  CATEGORY_SECTION_TITLES,
  isGameCategorySlug,
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
} from "@/data/lobby-catalog";

export default async function GamesCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isGameCategorySlug(category)) notFound();

  const label = CATEGORY_SECTION_TITLES[category as GameCategorySlug];

  let body: ReactNode;
  switch (category as GameCategorySlug) {
    case "platform":
      body = (
        <div className="grid grid-cols-3 gap-2.5">
          {PLATFORM_GAMES.map((g, i) => (
            <GamePoster key={`${g.title}-${i}`} href={g.href} title={g.title} rtp={g.rtp} img={g.img} />
          ))}
        </div>
      );
      break;
    case "popular":
      body = (
        <div className="grid grid-cols-3 gap-2.5">
          {SECTION_POPULAR.map((g, i) => (
            <GamePoster key={`${g.title}-${i}`} href={g.href} title={g.title} rtp={g.rtp} img={g.img} />
          ))}
        </div>
      );
      break;
    case "original":
      body = (
        <div className="grid grid-cols-2 gap-2.5">
          {SECTION_ORIGINAL.map((g) => (
            <GamePoster key={g.title + g.rtp} href={g.href} title={g.title} rtp={g.rtp} img={g.img} />
          ))}
        </div>
      );
      break;
    case "lottery":
      body = (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {SECTION_LOTTERY.slice(0, 2).map((c) => (
              <LotteryRowCard key={c.id} item={c} size="large" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SECTION_LOTTERY.slice(2).map((c) => (
              <LotteryRowCard key={c.id} item={c} size="compact" />
            ))}
          </div>
        </div>
      );
      break;
    case "casino":
      body = (
        <div className="grid grid-cols-3 gap-2.5">
          {SECTION_CASINO.map((g) => (
            <GamePoster key={g.title} title={g.title} img={g.img} />
          ))}
        </div>
      );
      break;
    case "slots":
      body = (
        <div className="grid grid-cols-3 gap-2.5">
          {SECTION_SLOTS.map((g) => (
            <GamePoster key={g.title} title={g.title} img={g.img} />
          ))}
        </div>
      );
      break;
    case "sports":
      body = (
        <div className="grid grid-cols-2 gap-2.5">
          {SECTION_SPORTS.map((g) => (
            <GamePoster key={g.title} title={g.title} img={g.img} />
          ))}
        </div>
      );
      break;
    case "rummy":
      body = (
        <div className="grid grid-cols-3 gap-2.5">
          {SECTION_RUMMY.map((g) => (
            <GamePoster key={g.title} title={g.title} img={g.img} />
          ))}
        </div>
      );
      break;
    case "fishing":
      body = (
        <div className="grid grid-cols-3 gap-2.5">
          {SECTION_FISHING.map((g) => (
            <GamePoster key={g.title} title={g.title} img={g.img} />
          ))}
        </div>
      );
      break;
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-zinc-500 pb-28 text-zinc-950">
      <div className="mx-auto w-full max-w-[430px] min-w-0 sm:py-6">
        <div className="min-h-dvh w-full bg-zinc-50 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[28px] sm:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.35)] sm:ring-1 sm:ring-zinc-200">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-100/80 bg-white/95 px-3 py-3.5 backdrop-blur">
            <Link
              href="/lobby"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-lg ring-1 ring-zinc-200/80 transition active:scale-95"
              aria-label="Back"
            >
              ‹
            </Link>
            <div className="flex min-w-0 flex-col">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">All games</div>
              <h1 className="truncate text-base font-bold leading-tight">{label}</h1>
            </div>
          </header>

          <div className="px-4 py-4">{body}</div>
        </div>
      </div>
    </div>
  );
}
