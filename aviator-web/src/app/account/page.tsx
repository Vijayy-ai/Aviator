"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MobileShell } from "@/components/layout/MobileShell";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { fetchMe, updateUsername } from "@/lib/api";

type Profile = { username: string; firebase_uid: string; platform_type: "WEB" | "APP"; fake_wallet_balance: string };

import Link from "next/link";

function ActionIcon({ kind }: { kind: "wallet" | "deposit" | "withdraw" | "vip" }) {
  const base = "flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-white/50";
  if (kind === "wallet") return <div className={base} aria-hidden>👛</div>;
  if (kind === "deposit") return <div className={base} aria-hidden>💳</div>;
  if (kind === "withdraw") return <div className={base} aria-hidden>🏦</div>;
  return <div className={base} aria-hidden>💎</div>;
}

function MenuRow({ icon, title, subtitle, right, href }: { icon: string; title: string; subtitle?: string; right?: React.ReactNode; href?: string }) {
  const content = (
    <div className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-zinc-200/70 active:scale-[0.99]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-lg ring-1 ring-rose-100" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold tracking-tight text-zinc-900">{title}</div>
        {subtitle ? <div className="mt-0.5 truncate text-xs font-medium text-zinc-500">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : <div className="shrink-0 text-xl text-zinc-300">›</div>}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return <button type="button" className="w-full text-left">{content}</button>;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, ready } = useFirebaseUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const email = user?.email ?? "";

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const me = await fetchMe();
        if (!mounted) return;
        setProfile(me.profile);
        setNameDraft(me.profile.username || "");
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ready, user, router]);

  const balance = useMemo(() => {
    const raw = profile?.fake_wallet_balance ?? "0";
    const n = Number(raw);
    if (Number.isFinite(n)) return n.toFixed(2);
    return raw;
  }, [profile?.fake_wallet_balance]);

  async function onSaveName() {
    const next = nameDraft.trim();
    if (!next) return;
    try {
      setSaving(true);
      const res = await updateUsername(next);
      setProfile(res.profile);
      setEditing(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <MobileShell>
        <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm font-semibold text-zinc-500">Loading…</div>
      </MobileShell>
    );
  }

  if (!user) return null;

  return (
    <MobileShell>
      <div className="min-w-0 max-w-full overflow-x-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-orange-400 px-4 pb-4 pt-3 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/25 ring-2 ring-white/40">
              <Image
                src={user.photoURL || "/platformrecomand/aviator.jpeg"}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {!editing ? (
                  <div className="min-w-0 truncate text-base font-extrabold tracking-tight">
                    {profile?.username || user.displayName || "MEMBER"}
                  </div>
                ) : (
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl bg-white/20 px-3 py-2 text-sm font-bold text-white placeholder:text-white/70 outline-none ring-1 ring-white/30"
                    placeholder="Enter name"
                    autoFocus
                  />
                )}
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="shrink-0 rounded-xl bg-white/20 px-2.5 py-2 text-xs font-bold ring-1 ring-white/25 active:scale-[0.98]"
                >
                  {editing ? "Cancel" : "Edit"}
                </button>
                {editing ? (
                  <button
                    type="button"
                    onClick={onSaveName}
                    disabled={saving}
                    className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-rose-600 shadow-sm active:scale-[0.98] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                ) : null}
              </div>
              <div className="mt-1 flex min-w-0 flex-col gap-0.5 text-xs font-semibold text-white/90">
                {email ? <span className="truncate">Email: {email}</span> : null}
                {profile?.firebase_uid ? <span className="truncate">UID: {profile.firebase_uid}</span> : null}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-xs font-semibold text-white/95 ring-1 ring-white/15">
              {error}
            </div>
          ) : null}
        </div>

        <div className="-mt-4 px-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-500">Total balance</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">
                  ₹{loading ? "—" : balance}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full bg-rose-500 px-4 py-2 text-sm font-extrabold text-white shadow-sm active:scale-[0.98]"
              >
                Enter wallet
              </button>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { id: "wallet", label: "ARWallet", kind: "wallet" as const, href: "#" },
                { id: "deposit", label: "Deposit", kind: "deposit" as const, href: "/account/deposit" },
                { id: "withdraw", label: "Withdraw", kind: "withdraw" as const, href: "/account/withdraw" },
                { id: "vip", label: "VIP", kind: "vip" as const, href: "#" },
              ].map((a) => {
                const inner = (
                  <>
                    <ActionIcon kind={a.kind} />
                    <div className="truncate text-xs font-bold text-zinc-800">{a.label}</div>
                  </>
                );
                return a.href && a.href !== "#" ? (
                  <Link href={a.href} key={a.id} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl py-2 active:scale-[0.99] outline-none">
                    {inner}
                  </Link>
                ) : (
                  <button key={a.id} type="button" className="flex min-w-0 flex-col items-center gap-2 rounded-2xl py-2 active:scale-[0.99]">
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 px-4">
          <MenuRow icon="📘" title="Game History" subtitle="My game history" href="/account/game-history" />
          <MenuRow icon="🧾" title="Transaction" subtitle="My transaction history" href="/account/transactions" />
          <MenuRow icon="💳" title="Deposit" subtitle="My deposit history" href="/account/deposit" />
          <MenuRow icon="🏦" title="Withdraw" subtitle="My withdraw history" href="/account/withdraw" />
        </div>

        <div className="mt-4 space-y-3 px-4 pb-4">
          <MenuRow icon="🔔" title="Notification" right={<span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-extrabold text-white">2</span>} />
          <MenuRow icon="🎁" title="Gifts" />
          <MenuRow icon="📊" title="Game statistics" />
          <MenuRow icon="🌐" title="Language" right={<span className="text-sm font-bold text-zinc-600">English</span>} />
        </div>
      </div>
    </MobileShell>
  );
}
