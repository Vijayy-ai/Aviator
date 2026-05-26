"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabId = "home" | "activity" | "promo" | "account";

function activeTabFromPath(pathname: string): TabId {
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/promotion")) return "promo";
  if (pathname.startsWith("/activity")) return "activity";
  return "home";
}

export function BottomTab() {
  const pathname = usePathname() || "/lobby";
  const active = activeTabFromPath(pathname);

  const tabs = [
    { id: "home", label: "Home", href: "/lobby", icon: TabIconHome },
    { id: "activity", label: "Activity", href: "/activity", icon: TabIconActivity },
    { id: "promo", label: "Promotion", href: "/promotion", icon: TabIconPromo },
    { id: "account", label: "Account", href: "/account", icon: TabIconAccount },
  ] as const;

  return (
    <div className="pointer-events-auto border-t border-zinc-200/90 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="grid grid-cols-4 gap-0.5 px-1 pb-[env(safe-area-inset-bottom,0px)] pt-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = active === t.id;
          return (
            <Link
              key={t.id}
              href={t.href}
              className={[
                "flex flex-col items-center gap-1 rounded-2xl py-2.5 text-xs font-semibold tracking-tight transition-colors",
                on ? "text-rose-600" : "text-zinc-500",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-2xl transition-colors",
                  on ? "bg-rose-50 text-rose-600 shadow-inner shadow-rose-100/80" : "bg-zinc-100/90 text-zinc-500",
                ].join(" ")}
              >
                <Icon active={on} />
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TabIconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2.1 : 1.75}
        strokeLinejoin="round"
        fill={active ? "rgba(244,63,94,0.12)" : "none"}
      />
    </svg>
  );
}

function TabIconActivity({ active }: { active: boolean }) {
  const w = active ? 2.1 : 1.75;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19h16M7 16V9m5 7V5m5 11v-4"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinecap="round"
      />
    </svg>
  );
}

function TabIconPromo({ active }: { active: boolean }) {
  const w = active ? 2.1 : 1.75;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16v4l-2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6L4 11V7Z"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth={w}
      />
    </svg>
  );
}

function TabIconAccount({ active }: { active: boolean }) {
  const w = active ? 2.1 : 1.75;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth={w} />
      <path
        d="M6.5 19.5c.8-2.2 2.9-3.5 5.5-3.5s4.7 1.3 5.5 3.5"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinecap="round"
      />
    </svg>
  );
}

