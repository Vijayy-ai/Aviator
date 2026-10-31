"use client";

import { useRouter } from "next/navigation";

import { GameShell } from "@/components/games/GameShell";
import { formatInr, useWalletBalance } from "@/components/games/useWalletBalance";

const POSTER = "/games/K3.png";
const RUPEE = "\u20B9";

export function K3Screen() {
  const router = useRouter();
  const { balance, loading, reload } = useWalletBalance();

  return (
    <GameShell className="bg-[#f6f7fb] text-zinc-900">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={POSTER} alt="K3" className="pointer-events-none block w-full select-none" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="absolute top-[0.2%] left-[1%] z-20 h-[2.6%] w-[14%] bg-transparent"
          />
          <div className="absolute top-[0.45%] left-[30%] z-10 flex h-[2.15%] w-[40%] items-center justify-center bg-[linear-gradient(90deg,#fc404c_0%,#fc444f_50%,#fc4b54_100%)] text-[18px] font-bold tracking-tight text-white">
            Tc Lottery
          </div>
          <div className="absolute top-[4.75%] left-[32%] z-10 flex h-[1.5%] w-[38%] items-center justify-center gap-2 bg-[#f6f7fa] text-[15px] font-bold tabular-nums text-[#2c2430]">
            <span>{loading ? "…" : `${RUPEE}${formatInr(balance)}`}</span>
            <button type="button" aria-label="Refresh balance" onClick={() => void reload()} className="text-[14px] leading-none">
              ↻
            </button>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
