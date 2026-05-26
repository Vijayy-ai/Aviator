import Link from "next/link";
import { LobbyImage } from "@/components/lobby/LobbyImage";

export type LotteryCardData = {
  id: string;
  title: string;
  img: string;
  gradient: string;
  href?: string;
};

/** Same visual language as category tiles — large left art, label bottom-right, contained in card */
export function LotteryRowCard({
  item,
  size = "large",
}: {
  item: LotteryCardData;
  size?: "large" | "compact";
}) {
  const tall = size === "large";
  const height = tall ? "h-[5.75rem]" : "h-[5.1rem]";
  const titleClass = tall ? "text-[0.95rem]" : "text-[10px] leading-snug";
  const iconWidth = tall ? "w-[72%]" : "w-[76%]";
  const iconLift = tall ? "h-[118%]" : "h-[120%]";

  const content = (
    <div
      className={[
        "relative w-full min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br shadow-[0_10px_24px_-8px_rgba(0,0,0,0.35)]",
        height,
        item.gradient,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.06)_38%,transparent_62%)]" />
      <div className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-5 h-20 w-20 rounded-full bg-black/10 blur-2xl" />

      <div className={`pointer-events-none absolute bottom-0 left-0 ${iconWidth} ${iconLift}`}>
        <LobbyImage
          src={item.img}
          alt=""
          fill
          sizes={tall ? "(max-width: 430px) 120px, 120px" : "(max-width: 430px) 80px, 80px"}
          className="object-contain object-left-bottom drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
        />
      </div>

      <span
        className={[
          "absolute bottom-2 right-2 z-10 max-w-[48%] text-right font-extrabold leading-tight tracking-tight text-white",
          "drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]",
          titleClass,
        ].join(" ")}
      >
        {item.title}
      </span>
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
