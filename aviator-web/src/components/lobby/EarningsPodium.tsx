const RUPEE = "\u20B9";

function Crown({ gold }: { gold?: boolean }) {
  const fill = gold ? "#f6c445" : "#c9b7f2";
  const gem = gold ? "#ef6b4a" : "#8b6ad6";
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden className="absolute -top-3.5 left-1/2 -translate-x-1/2 drop-shadow-sm">
      <path d="M3 17.5 6.2 7.2 11.2 12.2 15 3.2 18.8 12.2 23.8 7.2 27 17.5Z" fill={fill} />
      <rect x="3" y="17.2" width="24" height="3.2" rx="1.2" fill={fill} />
      <circle cx="15" cy="8.2" r="1.5" fill={gem} />
    </svg>
  );
}

function Portrait({ src, size }: { src: string; size: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} rounded-full object-cover ring-[3px] ring-white shadow-md`} />
  );
}

export function EarningsPodium({
  place,
  name,
  amount,
  tone,
  big,
  photo,
}: {
  place: string;
  name: string;
  amount: string;
  tone: "blue" | "rose" | "orange";
  big?: boolean;
  photo: string;
}) {
  const base =
    tone === "rose"
      ? "from-[#ff8b98] via-[#ff5d78] to-[#ff3d62]"
      : tone === "blue"
        ? "from-[#9ec6ff] via-[#6aa6ff] to-[#4b8ef5]"
        : "from-[#ffc07a] via-[#ff9a45] to-[#ff7a2f]";

  return (
    <div className={["flex min-w-0 flex-1 flex-col items-center justify-end", big ? "z-10" : ""].join(" ")}>
      <div className="relative z-10 mb-[-22px]">
        <Crown gold={tone !== "blue"} />
        <Portrait src={photo} size={big ? "h-[68px] w-[68px]" : "h-[54px] w-[54px]"} />
      </div>
      <div
        className={[
          "relative flex w-full flex-col items-center rounded-t-[22px] bg-gradient-to-b px-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
          base,
          big ? "min-h-[138px] pb-3 pt-7" : "min-h-[108px] pb-3 pt-7",
        ].join(" ")}
      >
        {big ? (
          <span className="relative z-20 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#f0b429] px-2 py-[1px] text-[10px] font-semibold tracking-wide text-[#8a5a10] shadow-sm">
            {place}
          </span>
        ) : (
          <div className="text-[11px] font-medium tracking-wide text-white/90">{place}</div>
        )}
        <div className={["w-full truncate text-center font-medium", big ? "mt-1 text-[13px]" : "mt-1 text-[12px]"].join(" ")}>{name}</div>
        {big ? (
          <div className="mt-1.5 rounded-full bg-white px-2 py-[3px] text-[11px] font-semibold tabular-nums text-[#e23b57] shadow-sm">
            {RUPEE}
            {amount}
          </div>
        ) : (
          <div className="mt-1 text-center text-[11px] font-semibold leading-tight tabular-nums text-white">
            {RUPEE}
            {amount}
          </div>
        )}
      </div>
    </div>
  );
}

export function EarningsListRow({
  rank,
  name,
  amount,
  photo,
}: {
  rank: number;
  name: string;
  amount: string;
  photo: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.45)] ring-1 ring-zinc-100">
      <div className="w-6 shrink-0 text-center text-[15px] font-medium text-zinc-400 tabular-nums">{rank}</div>
      <Portrait src={photo} size="h-10 w-10" />
      <div className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#5d6d88]">{name}</div>
      <div className="shrink-0 rounded-full bg-gradient-to-r from-[#ff9a86] to-[#ff5b6a] px-3.5 py-1.5 text-[13px] font-semibold tabular-nums text-white shadow-sm">
        {RUPEE}
        {amount}
      </div>
    </div>
  );
}
