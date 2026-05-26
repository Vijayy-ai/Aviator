import { toneGradientClass, type BannerTone } from "@/data/lobby-catalog";

const RUPEE = "\u20B9";

function formatPodiumAmount(raw: string): string {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return raw;
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)}L`;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function EarningsPodium({
  place,
  name,
  amount,
  tone,
  big,
}: {
  place: string;
  name: string;
  amount: string;
  tone: BannerTone;
  big?: boolean;
}) {
  const displayAmount = formatPodiumAmount(amount);

  return (
    <div className="min-w-0 flex-1 text-center">
      <div
        className={[
          "mx-auto flex w-full min-w-0 flex-col items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-br px-2 py-2.5 text-white shadow-sm",
          toneGradientClass(tone),
          big ? "h-[7.5rem]" : "h-[6.75rem]",
        ].join(" ")}
      >
        <div className="w-full text-[10px] font-extrabold tracking-wide">{place}</div>
        <div className="w-full truncate px-1 text-xs font-bold leading-tight">{name}</div>
        <div className="w-full max-w-full rounded-full bg-white/15 px-1.5 py-1 text-center text-[9px] font-bold leading-tight tabular-nums">
          {RUPEE}
          {displayAmount}
        </div>
      </div>
    </div>
  );
}

export function EarningsListRow({
  rank,
  name,
  amount,
}: {
  rank: number;
  name: string;
  amount: number;
}) {
  const label = amount.toLocaleString("en-IN");

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2.5">
      <div className="w-5 shrink-0 text-sm font-bold text-zinc-600 tabular-nums">{rank}</div>
      <div className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-800">{name}</div>
      <div className="max-w-[42%] shrink-0 truncate rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-2.5 py-1.5 text-[10px] font-bold tabular-nums text-white">
        {RUPEE}
        {label}
      </div>
    </div>
  );
}
