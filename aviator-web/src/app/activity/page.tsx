"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LobbyImage } from "@/components/lobby/LobbyImage";
import { MobileShell } from "@/components/layout/MobileShell";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { checkIn, fetchMe, redeemGift, type UserProfile } from "@/lib/api";

const RUPEE = "\u20B9";

export default function ActivityPage() {
  const { user, ready } = useFirebaseUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    void fetchMe().then((res) => setProfile(res.profile)).catch((err) => setError(err instanceof Error ? err.message : "Could not load bonuses"));
  }, [ready, user]);

  async function onCheckIn() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await checkIn();
      setProfile(res.profile);
      setNotice(`Attendance bonus ${RUPEE}${res.reward} added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await redeemGift(code);
      setProfile(res.profile);
      setNotice(`${res.title}: ${RUPEE}${res.reward} added.`);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redeem failed");
    } finally {
      setBusy(false);
    }
  }

  const today = Number(profile?.today_bonus ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = Number(profile?.total_bonus ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <MobileShell>
      <header className="bg-gradient-to-b from-[#ff8d86] to-[#ff6d66] px-4 pb-6 pt-5 text-white">
        <div className="text-center text-[20px] font-extrabold tracking-tight">Daman</div>
        <div className="mt-4 grid grid-cols-2 text-center">
          <div>
            <div className="text-[13px] text-white/90">Today&apos;s bonus</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums">{RUPEE}{today}</div>
          </div>
          <div className="border-l border-white/40">
            <div className="text-[13px] text-white/90">Total bonus</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums">{RUPEE}{total}</div>
          </div>
        </div>
        <button type="button" onClick={() => setDetails((v) => !v)} className="mx-auto mt-4 block rounded-full bg-white/95 px-6 py-2 text-[14px] font-semibold text-[#f95959]">
          Bonus details
        </button>
        {details ? (
          <p className="mt-3 text-center text-[12px] leading-5 text-white/95">
            Today&apos;s bonus resets each day. Total bonus keeps attendance and gift rewards. Betting rebate is paid on the Promotion tab.
          </p>
        ) : null}
      </header>

      <div className="space-y-4 px-4 py-4">
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
        {notice ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}

        <div className="grid grid-cols-4 gap-3 text-center text-[11px] font-medium text-zinc-700">
          <Link href="/promotion" className="flex flex-col items-center gap-1"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-lg">🏅</span>Activity Award</Link>
          <Link href="/promotion" className="flex flex-col items-center gap-1"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-lg">👥</span>Invitation bonus</Link>
          <Link href="/promotion" className="flex flex-col items-center gap-1"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-lg">🎟️</span>Betting rebate</Link>
          <Link href="/promotion" className="flex flex-col items-center gap-1"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-lg">🏆</span>Super Jackpot</Link>
        </div>

        <form onSubmit={onRedeem} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="text-[16px] font-bold">Gifts</div>
          <p className="mt-1 text-[13px] text-zinc-500">Enter the redemption code to receive gift rewards.</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Redemption code" className="mt-3 h-11 w-full rounded-xl bg-zinc-50 px-3 text-sm outline-none ring-1 ring-zinc-200" />
          <button type="submit" disabled={busy || !code.trim()} className="mt-3 h-11 w-full rounded-full bg-[#f95959] text-sm font-semibold text-white disabled:opacity-60">
            Redeem
          </button>
          <p className="mt-2 text-[12px] text-zinc-400">Try WELCOME50 once on this account.</p>
        </form>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="text-[16px] font-bold">Attendance bonus</div>
          <p className="mt-1 text-[13px] text-zinc-500">The more consecutive days you sign in, the higher the reward will be.</p>
          <button type="button" onClick={() => void onCheckIn()} disabled={busy} className="mt-3 h-11 w-full rounded-full bg-[#f95959] text-sm font-semibold text-white disabled:opacity-60">
            Claim {RUPEE}10 today
          </button>
        </div>

        <div className="space-y-3">
          {["/banner/take1.png", "/banner/take2.png", "/banner/take3.png", "/banner/take4.png", "/banner/take5.png"].map((src) => (
            <div key={src} className="relative aspect-[2.15/1] overflow-hidden rounded-2xl shadow-sm ring-1 ring-zinc-200">
              <LobbyImage src={src} alt="" fill sizes="430px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
