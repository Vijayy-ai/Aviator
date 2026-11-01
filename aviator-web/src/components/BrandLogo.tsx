/** Official Tc Lottery mark + wordmark */
export const TC_LOTTERY_LOGO_SRC = "/tc%20web.jpeg";

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  /** Hide the "Tc Lottery" label (rare) */
  hideText?: boolean;
  alt?: string;
};

export function BrandLogo({
  className = "flex items-center gap-2",
  imgClassName = "h-8 w-auto object-contain",
  textClassName = "text-[20px] font-extrabold leading-none tracking-tight text-[#ff3b30]",
  hideText = false,
  alt = "Tc Lottery",
}: BrandLogoProps) {
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={TC_LOTTERY_LOGO_SRC} alt={alt} className={imgClassName} />
      {hideText ? null : <span className={textClassName}>Tc Lottery</span>}
    </div>
  );
}
