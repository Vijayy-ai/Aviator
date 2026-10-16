"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LobbyImage } from "@/components/lobby/LobbyImage";

export function GamePoster({
  title,
  rtp,
  img,
  href,
  priority,
}: {
  title: string;
  img: string;
  href?: string;
  rtp?: string | null;
  priority?: boolean;
}) {
  const router = useRouter();
  const [askJoin, setAskJoin] = useState(false);
  const showRtp = rtp != null && rtp.length > 0;
  const isAviator = href === "/game";

  const Card = (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_10px_28px_-14px_rgba(0,0,0,0.35)]">
      <div className="relative aspect-[10/13] w-full min-h-[112px] sm:min-h-[120px]">
        <LobbyImage
          src={img}
          alt={title}
          fill
          priority={priority}
          sizes="(max-width: 430px) 34vw, 168px"
          className="object-cover"
        />
      </div>
      {showRtp ? (
        <div className="flex items-center justify-between bg-[#e11d48] px-2.5 py-2 text-[11px] font-bold tracking-wide text-white sm:text-xs">
          <span>RTP</span>
          <span className="tabular-nums">{rtp}</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {isAviator ? (
        <button type="button" onClick={() => setAskJoin(true)} className="block w-full min-w-0 text-left">
          {Card}
        </button>
      ) : href ? (
        <Link href={href} className="block min-w-0">
          {Card}
        </Link>
      ) : (
        Card
      )}

      {askJoin ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-8" onClick={() => setAskJoin(false)}>
          <div className="w-full max-w-[320px] overflow-hidden rounded-2xl bg-white text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-4">
              <div className="text-[17px] font-bold text-zinc-900">Tips</div>
              <p className="mt-3 text-[15px] leading-6 text-zinc-700">Are you sure you want to join the game?</p>
            </div>
            <div className="grid grid-cols-2 border-t border-zinc-200">
              <button type="button" onClick={() => setAskJoin(false)} className="h-12 border-r border-zinc-200 text-[16px] text-zinc-800">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem("aviator_enter_splash", "1");
                  } catch {
                    /* ignore */
                  }
                  setAskJoin(false);
                  router.push("/game");
                }}
                className="h-12 text-[16px] font-medium text-[#1677ff]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
