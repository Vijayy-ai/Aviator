"use client";

import { useRouter } from "next/navigation";

import { GameShell } from "@/components/games/GameShell";
import { formatInr, useWalletBalance } from "@/components/games/useWalletBalance";

export function ChickenRoadScreen() {
  const router = useRouter();
  const { balance, loading } = useWalletBalance();

  return (
    <GameShell className="bg-black text-white">
      <div className="flex min-h-0 flex-1 items-center">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/games/chickenraod2.png" alt="Chicken Road 2" className="pointer-events-none block w-full select-none" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="absolute top-[2.2%] right-[0.8%] z-20 flex h-[8%] w-[5.5%] items-center justify-center bg-[#182a45] text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="absolute top-[4.5%] right-[8.5%] z-10 flex h-[4.6%] w-[28%] items-center justify-end bg-[#182a45] pr-1 text-[11px] font-semibold tabular-nums text-white">
            {loading ? "…" : `${formatInr(balance)} INR`}
          </div>
          <button type="button" aria-label="Play" onClick={() => {}} className="absolute top-[74%] left-[55%] z-10 h-[22%] w-[40%] cursor-default bg-transparent" />
        </div>
      </div>
    </GameShell>
  );
}
