"use client";

import { useEffect, useState } from "react";
import { fetchGamePreviewState, type GamePreviewStateResponse } from "@/lib/api";
import { PREVIEW_WS_URL } from "@/lib/ws";

function fmtCrash(n: number) {
  return `${n.toFixed(2)}x`;
}

function CrashCircle({
  label,
  roundNumber,
  crash,
  accent,
}: {
  label: string;
  roundNumber: number;
  crash: number;
  accent: "rose" | "violet";
}) {
  const ring = accent === "rose" ? "ring-rose-500/40 shadow-[0_0_40px_-8px_rgba(255,59,92,0.55)]" : "ring-violet-500/35 shadow-[0_0_40px_-8px_rgba(139,92,246,0.45)]";
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-white/45">{label}</p>
      <div
        className={[
          "flex h-[min(42vw,200px)] w-[min(42vw,200px)] flex-col items-center justify-center rounded-full bg-[#12121a] ring-2",
          ring,
        ].join(" ")}
      >
        <span className="text-[11px] font-semibold text-white/50">Round {roundNumber}</span>
        <span className="mt-1 text-[clamp(28px,8vw,42px)] font-black tabular-nums text-white">{fmtCrash(crash)}</span>
      </div>
    </div>
  );
}

export default function RoundDisplayPage() {
  const [state, setState] = useState<GamePreviewStateResponse | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    void fetchGamePreviewState().then((s) => {
      if (s) setState(s);
    });
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;

    function connect() {
      ws = new WebSocket(PREVIEW_WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) window.setTimeout(connect, 1200);
      };
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as GamePreviewStateResponse;
          setState(data);
        } catch {
          /* ignore */
        }
      };
    }

    connect();
    return () => {
      closed = true;
      ws?.close();
    };
  }, []);

  const status = state?.status ?? "waiting";
  const currentCrash =
    state?.status === "crashed" && state.crash_point != null
      ? state.crash_point
      : (state?.current_crash_point ?? 0);
  const nextCrash = state?.next_crash_point ?? 0;
  const currentRound = state?.round_number ?? 0;
  const nextRound = state?.next_round_number ?? currentRound + 1;

  return (
    <div className="flex min-h-dvh flex-col bg-[#050506] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="text-sm font-extrabold tracking-tight text-white/90">Round display</h1>
        <span className="flex items-center gap-2 text-xs font-semibold text-white/55">
          <span className={["h-2 w-2 rounded-full", connected ? "bg-emerald-400" : "bg-zinc-600"].join(" ")} />
          {connected ? "Live sync" : "Connecting…"}
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10">
        {!state ? (
          <p className="text-sm text-white/50">Waiting for game engine… Run docker compose up</p>
        ) : (
          <>
            <CrashCircle label="Current round crash" roundNumber={currentRound} crash={currentCrash} accent="rose" />
            <CrashCircle label="Next round crash" roundNumber={nextRound} crash={nextCrash} accent="violet" />
            <div className="text-center text-xs font-semibold text-white/45">
              Phase: <span className="text-white/75">{status}</span>
              {status === "flying" && state.current_multiplier != null ? (
                <span className="ml-2 tabular-nums text-emerald-400/90">{state.current_multiplier.toFixed(2)}x live</span>
              ) : null}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-white/10 px-4 py-3 text-center text-[11px] leading-relaxed text-white/40">
        Second-site feed — same backend as main Aviator. Integrate this page or copy WS{" "}
        <span className="font-mono text-white/55">{PREVIEW_WS_URL}</span>
      </footer>
    </div>
  );
}
