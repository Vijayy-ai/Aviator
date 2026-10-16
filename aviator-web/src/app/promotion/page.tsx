"use client";

import { useEffect, useState } from "react";

import { MobileShell } from "@/components/layout/MobileShell";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { fetchAgency, type AgencyResponse, type AgencyStats } from "@/lib/api";

type Panel = "home" | "subs" | "commission" | "rules" | "service" | "rebate";

function StatBlock({ title, stats }: { title: string; stats: AgencyStats }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-[13px] font-semibold text-[#f95959]">{title}</div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] text-zinc-500">
        <div><div className="text-[18px] font-semibold text-zinc-900">{stats.registers}</div>Number of register</div>
        <div><div className="text-[18px] font-semibold text-emerald-600">{stats.deposit_number}</div>Deposit number</div>
        <div><div className="text-[18px] font-semibold text-amber-600">{stats.deposit_amount}</div>Deposit amount</div>
        <div><div className="text-[18px] font-semibold text-zinc-900">{stats.first_deposit_people}</div>Number of people making first deposit</div>
      </div>
    </div>
  );
}

export default function PromotionPage() {
  const { user, ready } = useFirebaseUser();
  const [data, setData] = useState<AgencyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("home");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    void fetchAgency().then(setData).catch((err) => setError(err instanceof Error ? err.message : "Could not load promotion"));
  }, [ready, user]);

  const link = typeof window !== "undefined" && data ? `${window.location.origin}/?invite=${data.invite_code}` : "";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <MobileShell>
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3">
        {panel === "home" ? <span className="w-8" /> : (
          <button type="button" aria-label="Back" onClick={() => setPanel("home")} className="text-lg text-zinc-700">‹</button>
        )}
        <div className="text-[17px] font-bold">Agency</div>
        <span className="w-8" />
      </div>

      {error ? <div className="mx-4 mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}

      {panel === "home" && data ? (
        <div className="space-y-3 px-4 pb-6">
          <div className="rounded-b-3xl bg-gradient-to-b from-[#ff8d86] to-[#ff6d66] px-4 py-6 text-center text-white">
            <div className="text-[28px] font-semibold">{data.yesterday_commission}</div>
            <div className="mx-auto mt-2 inline-block rounded-full bg-white px-4 py-1 text-[13px] font-semibold text-[#f95959]">Yesterday&apos;s total commission</div>
            <p className="mt-2 text-[12px] text-white/90">Upgrade the level to increase commission income</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatBlock title="Direct subordinates" stats={data.direct} />
            <StatBlock title="Team subordinates" stats={data.team} />
          </div>
          <button type="button" onClick={() => void copy(link)} className="h-12 w-full rounded-full bg-gradient-to-r from-[#ff8a82] to-[#f95959] text-[15px] font-bold text-white">
            {copied ? "Link copied" : "INVITATION LINK"}
          </button>
          <button type="button" onClick={() => void copy(data.invite_code)} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-zinc-200">
            <span className="text-[14px] font-semibold">Copy invitation code</span>
            <span className="text-[13px] text-zinc-500">{data.invite_code}</span>
          </button>
          {([
            ["subs", "Subordinate data"],
            ["commission", "Commission detail"],
            ["rules", "Invitation rules"],
            ["service", "Agent line customer service"],
            ["rebate", "Rebate ratio"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setPanel(id)} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-zinc-200">
              <span className="text-[14px] font-semibold">{label}</span>
              <span className="text-zinc-400">›</span>
            </button>
          ))}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <div className="text-[15px] font-bold">Promotion data</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center text-[12px] text-zinc-500">
              <div><div className="text-[18px] font-semibold text-zinc-900">{data.week_commission}</div>This Week</div>
              <div><div className="text-[18px] font-semibold text-zinc-900">{data.total_commission}</div>Total commission</div>
              <div><div className="text-[18px] font-semibold text-zinc-900">{data.direct.registers}</div>Direct Subordinate</div>
              <div><div className="text-[18px] font-semibold text-zinc-900">{data.team.registers}</div>Total number of subordinates in the team</div>
            </div>
          </div>
        </div>
      ) : null}

      {panel === "subs" ? (
        <div className="space-y-2 px-4 py-3">
          {(data?.subordinates.length ?? 0) === 0 ? <p className="text-sm text-zinc-500">No one has registered with your code yet.</p> : null}
          {data?.subordinates.map((person) => (
            <div key={person.name + person.joined} className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
              <div className="font-semibold">{person.name}</div>
              <div className="mt-1 text-[12px] text-zinc-500">Joined {person.joined} · Deposits {person.deposits} · {person.deposit_amount}</div>
            </div>
          ))}
        </div>
      ) : null}

      {panel === "commission" ? (
        <div className="space-y-2 px-4 py-3">
          {(data?.commissions.length ?? 0) === 0 ? <p className="text-sm text-zinc-500">No commission yet. It is added when someone you invited places a bet.</p> : null}
          {data?.commissions.map((row) => (
            <div key={row.created_at + row.from_name} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
              <div>
                <div className="font-semibold">{row.from_name}</div>
                <div className="text-[12px] text-zinc-500">Bet {row.bet_amount}</div>
              </div>
              <div className="font-semibold text-emerald-600">+{row.amount}</div>
            </div>
          ))}
        </div>
      ) : null}

      {panel === "rules" ? (
        <div className="space-y-3 px-4 py-3 text-[14px] leading-6 text-zinc-700">
          <p>Share your invitation code or link. When a new player registers with it, they become your direct subordinate.</p>
          <p>You earn {data?.rebate_rate ?? "0.60%"} of each bet they place. Their invites count in your team.</p>
          <p>Commission is calculated on the server when the bet is accepted.</p>
        </div>
      ) : null}

      {panel === "service" ? (
        <div className="px-4 py-3 text-[14px] leading-6 text-zinc-700">
          For agent support, contact customer service from the account page and include your invitation code {data?.invite_code}.
        </div>
      ) : null}

      {panel === "rebate" ? (
        <div className="px-4 py-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <div className="text-[14px] text-zinc-500">Betting rebate</div>
            <div className="mt-1 text-[28px] font-semibold text-[#f95959]">{data?.rebate_rate}</div>
            <p className="mt-2 text-[13px] leading-6 text-zinc-600">This rate applies to every accepted bet from a direct subordinate.</p>
          </div>
        </div>
      ) : null}
    </MobileShell>
  );
}
