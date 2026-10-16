"use client";

import { useRouter, useParams } from "next/navigation";

import { findPlayableGame } from "@/data/lobby-catalog";

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

const PROVIDER_CODES = [
  "jackpottrain0000",
  "whatsupwitcr96f1",
  "TombstoneBegins",
  "lokisdescendants",
  "divinegoldr96f10",
  "SanQuentinManhunt",
  "aztectribute0000",
  "monopolymapotsv1",
  "PunkRocker3",
  "sharkboss0000000",
  "deadalive3r96f10",
  "archdragonking00",
  "CatfishHunters",
  "godbreakerr96f10",
];

/** Provider demo launch until the client supplies each game's production launch API. */
function providerLaunchUrl(id: string) {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gameCode = PROVIDER_CODES[hash % PROVIDER_CODES.length];
  return `https://playin.com/embed/v1/demo/${gameCode}`;
}

export default function PlayGamePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const game = findPlayableGame(id);
  const iframeUrl = providerLaunchUrl(id);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-zinc-950">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 shadow-sm relative z-20">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition active:scale-95 hover:bg-zinc-700"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="truncate px-3 text-[15px] font-bold tracking-wide text-zinc-100">{game.title}</div>
        <div className="w-9" />
      </div>

      <div className="relative flex-1 bg-black">
        <iframe
          src={iframeUrl}
          className="h-full w-full border-none"
          title={game.title}
          loading="lazy"
          allowFullScreen
        />
      </div>
    </div>
  );
}
