"use client";

import { useRouter } from "next/navigation";

import { APP_CHROME_BG } from "@/components/layout/AppChrome";

export function GameShell({
  children,
  className = "bg-[#f4f6fb]",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["h-dvh w-full overflow-hidden", APP_CHROME_BG].join(" ")}>
      <div className={["relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden", className].join(" ")}>
        {children}
      </div>
    </div>
  );
}

export function BackButton({ light = false }: { light?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => router.back()}
      className={["flex h-9 w-9 items-center justify-center", light ? "text-white" : "text-zinc-800"].join(" ")}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
