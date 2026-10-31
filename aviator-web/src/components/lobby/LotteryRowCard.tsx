import Link from "next/link";
import { LobbyImage } from "@/components/lobby/LobbyImage";

export type LotteryCardData = {
  id: string;
  title: string;
  img: string;
  gradient: string;
  href?: string;
};

/** Coral tile: title on top, artwork centered, same shape for every lottery game. */
export function LotteryRowCard({ item }: { item: LotteryCardData }) {
  const content = (
    <div className="flex h-[9.4rem] w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-[#ff7f78] px-1.5 pb-2 pt-2.5">
      <div className="text-center text-[13px] font-semibold leading-tight text-white">{item.title}</div>
      <div className="relative mt-1 min-h-0 flex-1">
        <LobbyImage src={item.img} alt="" fill sizes="(max-width: 430px) 120px, 140px" className="object-contain object-center" />
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block w-full outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
