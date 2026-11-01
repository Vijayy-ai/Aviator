"use client";

import { useRouter } from "next/navigation";

import { GameShell } from "@/components/games/GameShell";
import { formatInr, useWalletBalance } from "@/components/games/useWalletBalance";

const RUPEE = "\u20B9";

export function DamanPosterScreen({
  src,
  alt,
  titleClassName,
}: {
  src: string;
  alt: string;
  titleClassName: string;
}) {
  const router = useRouter();
  const { balance, loading, reload } = useWalletBalance();

  return (
    <GameShell className="bg-[#f6f7fb] text-zinc-900">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="pointer-events-none block w-full select-none" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="absolute top-[0.2%] left-[1%] z-20 h-[2.6%] w-[14%] bg-transparent"
          />
          <div
            className={[
              "absolute top-[0.45%] left-[30%] z-10 flex h-[2.15%] w-[40%] items-center justify-center gap-1 text-[16px] font-bold tracking-tight text-white",
              titleClassName,
            ].join(" ")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tc%20web.jpeg" alt="" className="h-[70%] w-auto object-contain" />
            <span>Tc Lottery</span>
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

export function FiveDScreen() {
  return (
    <DamanPosterScreen
      src="/games/5d.png"
      alt="5D"
      titleClassName="bg-[linear-gradient(90deg,#fc4145_0%,#fd4446_50%,#fd4d4b_100%)]"
    />
  );
}

export function TrxWinGoScreen() {
  return (
    <DamanPosterScreen
      src="/games/trxwingo.png"
      alt="Trx Win Go"
      titleClassName="bg-[linear-gradient(90deg,#fc4e51_0%,#fe5757_55%,#fc5757_100%)]"
    />
  );
}
