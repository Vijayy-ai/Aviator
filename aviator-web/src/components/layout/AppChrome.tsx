/** Outer frame behind the mobile column — slightly lighter than zinc-500, not fully light */
export const APP_CHROME_BG = "bg-[#6d6d76]";

export function AppChrome({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["h-dvh w-full overflow-hidden", APP_CHROME_BG, className].join(" ")}>
      <div className="mx-auto h-full w-full max-w-[430px] min-w-0">{children}</div>
    </div>
  );
}
