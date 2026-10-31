"use client";

import { useRouter } from "next/navigation";
import { GameShell } from "@/components/games/GameShell";
import { formatInr, useWalletBalance } from "@/components/games/useWalletBalance";

const POSTER = "/games/Money%20Coming%20Casino%20Interface.png";

export function MoneyComingScreen() {
  const router = useRouter();
  const { balance, loading } = useWalletBalance();

  return (
    <GameShell className="bg-black text-white">
      <div className="flex min-h-0 flex-1 items-center">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={POSTER} alt="Money Coming" className="pointer-events-none block w-full select-none" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="absolute top-[2%] left-[1.5%] z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="absolute top-[92.2%] left-[16.5%] z-10 flex h-[6.8%] w-[19%] items-center justify-center bg-[linear-gradient(180deg,#6d3b14_0%,#5c2d09_55%,#4a2206_100%)] text-[12px] font-bold tabular-nums text-white">
            {loading ? "…" : `\u20B9${formatInr(balance)}`}
          </div>
          <button type="button" aria-label="Spin" onClick={() => {}} className="absolute top-[80%] left-[76%] z-10 h-[19%] w-[16%] cursor-default rounded-full bg-transparent" />
        </div>
      </div>
    </GameShell>
  );
}
