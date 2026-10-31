"use client";

import { useRouter } from "next/navigation";

import { GameShell } from "@/components/games/GameShell";
import { formatInr, useWalletBalance } from "@/components/games/useWalletBalance";

const POSTER = "/games/damanvipgames.com_(iPhone%20SE).png";
const RUPEE = "\u20B9";

export function WinGoScreen() {
  const router = useRouter();
  const { balance, loading, reload } = useWalletBalance();

  return (
    <GameShell className="bg-[#f6f7fb] text-zinc-900">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={POSTER} alt="WinGo" className="pointer-events-none block w-full select-none" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="absolute top-[0.2%] left-[1%] z-20 h-[2.6%] w-[14%] bg-transparent"
          />
          <div className="absolute top-[0.7%] left-[31%] z-10 flex h-[2.55%] w-[38%] items-center justify-center bg-[linear-gradient(90deg,#fb484e_0%,#fc4a50_50%,#fc5155_100%)] text-[18px] font-bold tracking-tight text-white">
            Tc Lottery
          </div>
          <div className="absolute top-[5.95%] left-[32%] z-10 flex h-[1.65%] w-[40%] items-center justify-center gap-2 bg-[#f6f6f6] text-[15px] font-bold tabular-nums text-[#412637]">
            <span>{loading ? "…" : `${RUPEE}${formatInr(balance)}`}</span>
            <button type="button" aria-label="Refresh balance" onClick={() => void reload()} className="text-[14px] leading-none text-[#412637]">
              ↻
            </button>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
