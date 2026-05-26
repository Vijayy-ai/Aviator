import { APP_CHROME_BG } from "@/components/layout/AppChrome";
import { BottomTab } from "@/components/nav/BottomTab";

export function MobileShell({
  children,
  showTab = true,
}: {
  children: React.ReactNode;
  showTab?: boolean;
}) {
  return (
    <div className={["h-dvh w-full overflow-hidden text-zinc-950", APP_CHROME_BG].join(" ")}>
      <div className="mx-auto h-full w-full max-w-[430px] min-w-0">
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-zinc-50 sm:rounded-[28px] sm:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.35)] sm:ring-1 sm:ring-zinc-200">
          <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            {children}
          </div>
          {showTab ? (
            <div className="shrink-0 border-t border-zinc-200/80 bg-white">
              <BottomTab />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
