import { LobbyImage } from "@/components/lobby/LobbyImage";

export type CategoryTileData = {
  id: string;
  title: string;
  iconSrc: string;
  /** Tailwind gradient stops, e.g. `from-[#3d6ef5] to-[#78b4ff]` */
  gradient: string;
  labelAlign: "top-right" | "bottom-right";
};

export function CategoryTile({
  tile,
  size,
  onSelect,
  priority,
}: {
  tile: CategoryTileData;
  size: "large" | "small";
  onSelect: () => void;
  priority?: boolean;
}) {
  const tall = size === "large";
  const height = tall ? "h-[6.25rem]" : "h-[5.35rem]";
  const titleClass = tall ? "text-[1.18rem]" : "text-[0.88rem]";
  const iconWidth = tall ? "w-[70%]" : "w-[74%]";
  const iconLift = tall ? "h-[128%]" : "h-[132%]";

  const labelPos =
    tile.labelAlign === "top-right"
      ? "top-2 right-2.5 text-right"
      : "bottom-2 right-2.5 text-right";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="block w-full min-w-0 text-left transition active:scale-[0.98]"
    >
      <div
        className={[
          "relative w-full overflow-visible rounded-2xl bg-gradient-to-br shadow-[0_10px_24px_-8px_rgba(0,0,0,0.35)]",
          height,
          tile.gradient,
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.06)_38%,transparent_62%)]" />
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-black/10 blur-2xl" />

        <div className={`pointer-events-none absolute bottom-0 left-0 ${iconWidth} ${iconLift}`}>
          <LobbyImage
            src={tile.iconSrc}
            alt=""
            fill
            priority={priority}
            sizes={tall ? "(max-width: 430px) 140px, 140px" : "(max-width: 430px) 96px, 96px"}
            className="object-contain object-left-bottom drop-shadow-[0_4px_12px_rgba(0,0,0,0.28)]"
          />
        </div>

        <span
          className={[
            "absolute z-10 font-extrabold leading-tight tracking-tight text-white",
            "drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]",
            titleClass,
            labelPos,
          ].join(" ")}
        >
          {tile.title}
        </span>
      </div>
    </button>
  );
}
