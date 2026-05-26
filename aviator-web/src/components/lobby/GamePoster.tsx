import Link from "next/link";

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
  const showRtp = rtp != null && rtp.length > 0;
  const Card = (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl bg-zinc-100 shadow-[0_10px_28px_-14px_rgba(0,0,0,0.35)]">
      <div className="relative aspect-[10/13] w-full min-h-[148px] sm:min-h-[158px]">
        <LobbyImage
          src={img}
          alt={title}
          fill
          priority={priority}
          sizes="(max-width: 430px) 34vw, 168px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-2.5 pb-2 pt-12">
          <div className="text-[13px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] sm:text-sm">
            {title}
          </div>
        </div>
      </div>
      {showRtp ? (
        <div className="flex items-center justify-between bg-[#e11d48] px-2.5 py-2 text-[11px] font-bold tracking-wide text-white sm:text-xs">
          <span>RTP</span>
          <span className="tabular-nums">{rtp}</span>
        </div>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block min-w-0">
      {Card}
    </Link>
  ) : (
    Card
  );
}
