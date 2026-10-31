"use client";

import { useRouter } from "next/navigation";

import { GameShell } from "@/components/games/GameShell";

export function MotoRaceScreen() {
  const router = useRouter();

  return (
    <GameShell className="bg-[#f4f6fb] text-zinc-900">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/games/motorace.png" alt="Moto Racing" className="pointer-events-none block w-full select-none" />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="absolute top-[0.15%] left-[0.5%] z-20 h-[2.8%] w-[14%] bg-transparent"
          />
        </div>
      </div>
    </GameShell>
  );
}
