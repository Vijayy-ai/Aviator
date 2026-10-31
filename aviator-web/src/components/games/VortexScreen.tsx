"use client";

import { useRouter } from "next/navigation";

import { GameShell } from "@/components/games/GameShell";
import { formatInr, useWalletBalance } from "@/components/games/useWalletBalance";

export function VortexScreen() {
  const router = useRouter();
  const { balance, loading } = useWalletBalance();

  return (
    <GameShell className="bg-[#12141c] text-white">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/games/vertex.png" alt="Vortex" className="pointer-events-none block w-full select-none" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="absolute top-[0.55%] right-[1.4%] z-20 flex h-[3.1%] w-[8%] items-center justify-center bg-[#12182a] text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="absolute top-[1.05%] left-[7.6%] z-10 flex h-[2.35%] w-[34%] items-center bg-[#141b29] pl-1 text-[13px] font-semibold tabular-nums text-white">
            {loading ? "…" : `${formatInr(balance)} INR`}
          </div>
          <button type="button" aria-label="Hold to spin" onClick={() => {}} className="absolute top-[77.5%] left-[37%] z-10 h-[18%] w-[26%] cursor-default rounded-full bg-transparent" />
        </div>
      </div>
    </GameShell>
  );
}
