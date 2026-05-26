"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_CHROME_BG } from "@/components/layout/AppChrome";
import { WS_URL } from "@/lib/ws";
import { cashout, fetchGameState, fetchMe, placeBet, type GameStateResponse } from "@/lib/api";
import { startAviatorSimulation } from "@/lib/aviator-simulation";
import { crashForRound } from "@/data/crash-sequence";

const FORCE_AVIATOR_SIM = false;
const ALLOW_SIM_FALLBACK = false;

type WaitingPayload = { status: "waiting"; time_left: number; round_id: number; round_number: number };
type FlyingPayload = { status: "flying"; current_multiplier: number; round_id: number; round_number: number };
type CrashedPayload = { status: "crashed"; crash_point: number; round_id: number; round_number: number };
type GamePayload = WaitingPayload | FlyingPayload | CrashedPayload;

function formatX(v: number) {
  return `${v.toFixed(2)}x`;
}

type BetPanelMode = "bet" | "auto";
type BetPanelState = {
  amount: string;
  mode: BetPanelMode;
  autoBetEnabled: boolean;
  autoCashoutEnabled: boolean;
  autoCashoutAt: string; // e.g. "1.10"
  placing: boolean;
  cashing: boolean;
  lastActionError: string | null;
  placedRoundId: number | null;
  cashedRoundId: number | null;
};

type BetsTab = "all" | "previous" | "top";
type BetRow = {
  id: string;
  player: string;
  betInr: number;
  cashoutX: number | null;
  winInr: number;
  status: "pending" | "won" | "lost";
  createdAt: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtINR(v: number) {
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parsePositiveNumber(s: string) {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function maskedPlayer(seed = 0) {
  const heads = ["a", "b", "c", "d", "g", "h", "j", "k", "m", "p", "s", "y"];
  const tail = ["0", "1", "3", "4", "6", "8", "9", "f", "t", "#"];
  const h = heads[seed % heads.length]!;
  const t = tail[(seed * 3 + 2) % tail.length]!;
  return `${h}***${t}`;
}

function makeSeedBets(): BetRow[] {
  const base = [8000, 8000, 4907.28, 2000, 2000, 1890.93, 1500, 1076.55, 1000, 1000, 1000, 1000];
  return base.map((amt, i) => ({
    id: `seed_${i}`,
    player: maskedPlayer(i),
    betInr: amt,
    cashoutX: null,
    winInr: 0,
    status: "pending",
    createdAt: 1_700_000_000_000 - i * 1200,
  }));
}

function betQuickChipRow() {
  return [100, 200, 500, 1000];
}



/** Deterministic per round — avoids SSR/client hydration mismatch from Math.random() */
function arenaPlayersForRound(roundId: number | null | undefined): number {
  if (roundId == null) return 1200;
  const seed = ((roundId * 9301 + 49297) >>> 0) % 2400;
  return 420 + seed;
}

function crashKey(payload: CrashedPayload) {
  return `${payload.round_id}:${payload.crash_point}`;
}

function stateToPayload(state: GameStateResponse): GamePayload {
  if (state.status === "waiting") {
    return {
      status: "waiting",
      time_left: Number(state.time_left ?? 0),
      round_id: state.round_id,
      round_number: state.round_number,
    };
  }
  if (state.status === "flying") {
    return {
      status: "flying",
      current_multiplier: Number(state.current_multiplier ?? 1),
      round_id: state.round_id,
      round_number: state.round_number,
    };
  }
  return {
    status: "crashed",
    crash_point: Number(state.crash_point ?? 1),
    round_id: state.round_id,
    round_number: state.round_number,
  };
}

const LS_ANIM = "aviator_animation";
const LS_MUSIC = "aviator_music";
const LS_NAME = "aviator_display_name";

const AVIATOR_MUSIC_SRC = "/aviator%20music.mp3";

function randomDisplayName() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function GamePage() {
  const [connected, setConnected] = useState(false);
  const [payload, setPayload] = useState<GamePayload | null>(null);
  const [heldCrash, setHeldCrash] = useState<CrashedPayload | null>(null);
  const [dismissedCrashKey, setDismissedCrashKey] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [betsTab, setBetsTab] = useState<BetsTab>("all");
  const [bets, setBets] = useState<BetRow[]>(() => makeSeedBets());
  const [myUserLabel] = useState<string>("You");
  const [showPanel2, setShowPanel2] = useState(false);

  const [winOverlay, setWinOverlay] = useState<{
    show: boolean;
    amount: number;
    multiplier: number;
  } | null>(null);
  const [lossOverlay, setLossOverlay] = useState<{
    show: boolean;
    amount: number;
  } | null>(null);

  useEffect(() => {
    if (winOverlay) {
      const t = setTimeout(() => setWinOverlay(null), 2000);
      return () => clearTimeout(t);
    }
  }, [winOverlay]);

  useEffect(() => {
    if (lossOverlay) {
      const t = setTimeout(() => setLossOverlay(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lossOverlay]);

  useEffect(() => {
    if (payload?.status === "waiting") {
      setWinOverlay(null);
      setLossOverlay(null);
    }
  }, [payload?.status]);

  const [panel1, setPanel1] = useState<BetPanelState>({
    amount: "10.00",
    mode: "bet",
    autoBetEnabled: false,
    autoCashoutEnabled: false,
    autoCashoutAt: "1.10",
    placing: false,
    cashing: false,
    lastActionError: null,
    placedRoundId: null,
    cashedRoundId: null,
  });
  const [panel2, setPanel2] = useState<BetPanelState>({
    amount: "10.00",
    mode: "bet",
    autoBetEnabled: false,
    autoCashoutEnabled: false,
    autoCashoutAt: "1.10",
    placing: false,
    cashing: false,
    lastActionError: null,
    placedRoundId: null,
    cashedRoundId: null,
  });

  const crashFlashRef = useRef(0);
  const lastRoundIdRef = useRef<number | null>(null);
  const lastAutoBetRoundRef = useRef<{ p1: number | null; p2: number | null }>({ p1: null, p2: null });
  const lastCrashKeyRef = useRef<string | null>(null);
  const heldCrashTimerRef = useRef<number | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const wsConnectedRef = useRef(false);
  const lastRoundNumberRef = useRef(1);
  const lastCrashResolveKeyRef = useRef<string | null>(null);
  const stopSimRef = useRef<(() => void) | null>(null);
  const simStartedRef = useRef(false);
  const simBetKeysRef = useRef(new Set<string>());
  const simCashoutKeysRef = useRef(new Set<string>());
  const historySeededRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    try {
      const a = localStorage.getItem(LS_ANIM);
      const m = localStorage.getItem(LS_MUSIC);
      const n = localStorage.getItem(LS_NAME);
      if (a === "0") setAnimationEnabled(false);
      if (a === "1") setAnimationEnabled(true);
      if (m === "1") setMusicEnabled(true);
      if (m === "0") setMusicEnabled(false);
      if (n && n.trim()) {
        setDisplayName(n.trim());
      } else {
        const rnd = randomDisplayName();
        setDisplayName(rnd);
        localStorage.setItem(LS_NAME, rnd);
      }
    } catch {
      setDisplayName((d) => d || randomDisplayName());
    }
  }, []);

  useEffect(() => {
    const el = musicAudioRef.current;
    if (!el) return;
    el.loop = true;
    if (!musicEnabled) {
      el.pause();
      el.currentTime = 0;
      return;
    }
    void el.play().catch(() => {});
  }, [musicEnabled]);

  useEffect(() => {
    let unsubscribe = () => {};
    import("@/lib/firebase").then(({ firebaseAuth }) => {
      unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
          fetchMe()
            .then((res) => setWallet(res.profile.fake_wallet_balance))
            .catch(() => setWallet(null));
        } else {
          setWallet(null);
        }
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only load from backend.
  }, [simulationActive, wallet]);

  useEffect(() => {
    const t = setInterval(() => {
      setBets((prev) => {
        const now = Date.now();
        const betInr = [1000, 1000, 1500, 2000, 3000, 4000, 4907.28, 5752.21, 6000, 7000, 8000][
          Math.floor(Math.random() * 11)
        ]!;
        const x = Math.random() < 0.33 ? (Math.random() * 2.2 + 1.01) : null;
        const win = x ? Math.round(betInr * x * 100) / 100 : 0;
        const status: BetRow["status"] = x ? "won" : "pending";
        const row: BetRow = {
          id: `r_${now}_${Math.random().toString(16).slice(2)}`,
          player: maskedPlayer(),
          betInr,
          cashoutX: x ? Math.round(x * 100) / 100 : null,
          winInr: win,
          status,
          createdAt: now,
        };
        return [row, ...prev].slice(0, 350);
      });
    }, 950);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (FORCE_AVIATOR_SIM) {
      simStartedRef.current = true;
      setSimulationActive(true);
      setConnected(true);
      setLastError(null);
      stopSimRef.current = startAviatorSimulation((p) => {
        setPayload(p);
        if (p.status === "crashed") crashFlashRef.current = Date.now();
      });
      return () => {
        stopSimRef.current?.();
        stopSimRef.current = null;
        simStartedRef.current = false;
      };
    }

    let ws: WebSocket | null = null;
    let closed = false;
    let fallbackTimer: number | null = null;
    let simFallbackTimer: number | null = null;

    function clearFallbackTimers() {
      if (fallbackTimer != null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (simFallbackTimer != null) {
        window.clearTimeout(simFallbackTimer);
        simFallbackTimer = null;
      }
    }

    function stopSimulation() {
      stopSimRef.current?.();
      stopSimRef.current = null;
      const wasSim = simStartedRef.current;
      simStartedRef.current = false;
      if (wasSim) setSimulationActive(false);
    }

    function applyPayload(data: GamePayload) {
      lastRoundNumberRef.current = data.round_number;
      setPayload(data);
      if (data.status === "crashed") crashFlashRef.current = Date.now();

      // Seed history from predefined crash sequence on first payload
      if (!historySeededRef.current && data.round_number > 1) {
        historySeededRef.current = true;
        const pastCrashes: number[] = [];
        // Look back up to 40 rounds to populate history pills
        const lookBack = Math.min(data.round_number - 1, 40);
        for (let i = 0; i < lookBack; i++) {
          const rn = data.round_number - 1 - i;
          if (rn >= 1) pastCrashes.push(crashForRound(rn));
        }
        if (pastCrashes.length > 0) {
          setHistory(pastCrashes);
        }
      } else if (!historySeededRef.current && data.round_number === 1) {
        historySeededRef.current = true;
      }
    }

    function startSimulationFallback() {
      if (closed || simStartedRef.current || wsConnectedRef.current) return;
      simStartedRef.current = true;
      setSimulationActive(true);
      setConnected(true);
      setLastError(null);
      const startRound = lastRoundNumberRef.current;
      stopSimRef.current = startAviatorSimulation((p) => applyPayload(p), {
        startRoundNumber: startRound,
        baseRoundId: 9_000_000,
      });
      // setWallet((w) => w ?? "10000.00"); // Removed hardcoded wallet
    }

    function scheduleSimFallback(delayMs: number) {
      if (simFallbackTimer != null) window.clearTimeout(simFallbackTimer);
      simFallbackTimer = window.setTimeout(() => {
        simFallbackTimer = null;
        if (!closed && !wsConnectedRef.current && !simStartedRef.current) {
          startSimulationFallback();
        }
      }, delayMs);
    }

    void fetchGameState()
      .then((state) => {
        if (closed || !state) return;
        applyPayload(stateToPayload(state));
      })
      .catch(() => {});

    function connect() {
      if (closed) return;
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        wsConnectedRef.current = true;
        setConnected(true);
        setLastError(null);
        clearFallbackTimers();
        stopSimulation();
        void fetchMe()
          .then((res) => setWallet(res.profile.fake_wallet_balance))
          .catch(() => {});
      };

      ws.onclose = () => {
        wsConnectedRef.current = false;
        setConnected(false);
        if (!closed) {
          setLastError("Game server disconnected — reconnecting…");
          window.setTimeout(connect, 1100);
        }
        if (!closed && ALLOW_SIM_FALLBACK && !simStartedRef.current) scheduleSimFallback(4500);
      };

      ws.onerror = () => {
        setLastError(null);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as GamePayload;
          applyPayload(data);
        } catch {
          // ignore
        }
      };
    }

    if (ALLOW_SIM_FALLBACK) {
      fallbackTimer = window.setTimeout(() => {
        fallbackTimer = null;
        if (!closed && !wsConnectedRef.current && !simStartedRef.current) {
          startSimulationFallback();
        }
      }, 5500);
    } else {
      setLastError("Connect backend: docker compose up (game-engine + WebSocket)");
    }

    connect();

    return () => {
      closed = true;
      clearFallbackTimers();
      stopSimulation();
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const status = payload?.status ?? "waiting";
  const roundId = payload?.round_id ?? null;
  const waitingLeft = payload?.status === "waiting" ? payload.time_left : null;
  const activePayload =
    payload?.status === "crashed" && dismissedCrashKey === crashKey(payload)
      ? null
      : payload;
  const visualPayload = heldCrash ?? activePayload;
  const visualStatus = visualPayload?.status ?? "waiting";

  const multiplier = useMemo(() => {
    if (!visualPayload) return 1.0;
    if (visualPayload.status === "flying") return visualPayload.current_multiplier;
    if (visualPayload.status === "crashed") return visualPayload.crash_point;
    return 1.0;
  }, [visualPayload]);

  const crashed = visualStatus === "crashed";
  const waiting = visualStatus === "waiting";
  const flying = visualStatus === "flying";

  useEffect(() => {
    if (payload?.status !== "crashed") return;
    const key = crashKey(payload);
    if (lastCrashKeyRef.current === key) return;
    if (heldCrashTimerRef.current !== null) {
      window.clearTimeout(heldCrashTimerRef.current);
      heldCrashTimerRef.current = null;
    }
    lastCrashKeyRef.current = key;
    setDismissedCrashKey(null);
    setHeldCrash(payload);
    heldCrashTimerRef.current = window.setTimeout(() => {
      setHeldCrash(null);
      setDismissedCrashKey(key);
      heldCrashTimerRef.current = null;
    }, 2000);
  }, [payload]);

  useEffect(() => {
    return () => {
      if (heldCrashTimerRef.current !== null) {
        window.clearTimeout(heldCrashTimerRef.current);
        heldCrashTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (payload?.status !== "crashed") return;
    const key = crashKey(payload);
    if (lastCrashResolveKeyRef.current === key) return;
    lastCrashResolveKeyRef.current = key;

    setHistory((prev) => [payload.crash_point, ...prev].slice(0, 40));
    setBets((prev) => {
      let lostAmt = 0;
      prev.forEach((r) => {
        if (r.player === myUserLabel && r.status === "pending") {
          lostAmt += r.betInr;
        }
      });
      if (lostAmt > 0) {
        setLossOverlay({
          show: true,
          amount: lostAmt,
        });
      }

      return prev.map((r) => {
        if (r.status !== "pending") return r;
        if (r.player === myUserLabel) {
          return { ...r, status: "lost", cashoutX: null, winInr: 0 };
        }
        const win = Math.random() < 0.18;
        const x = win ? Math.round((1.01 + Math.random() * 1.6) * 100) / 100 : null;
        const winInr = x ? Math.round(r.betInr * x * 100) / 100 : 0;
        return { ...r, status: win ? "won" : "lost", cashoutX: x, winInr };
      });
    });
    if (!simulationActive) {
      void fetchMe()
        .then((res) => setWallet(res.profile.fake_wallet_balance))
        .catch(() => {});
    }
  }, [myUserLabel, payload, simulationActive]);

  useEffect(() => {
    if (!roundId) return;
    if (lastRoundIdRef.current !== roundId) {
      lastRoundIdRef.current = roundId;
      simBetKeysRef.current.clear();
      simCashoutKeysRef.current.clear();
      setPanel1((p) => ({ ...p, lastActionError: null, cashedRoundId: null, placedRoundId: null }));
      setPanel2((p) => ({ ...p, lastActionError: null, cashedRoundId: null, placedRoundId: null }));
    }
  }, [roundId]);

  const doPlaceBet = useCallback(async (panelIdx: 1 | 2) => {
    if (!roundId || status !== "waiting") return;
    const state = panelIdx === 1 ? panel1 : panel2;
    if (state.placing) return;
    if (state.placedRoundId === roundId) return;
    const amountN = parsePositiveNumber(state.amount);
    if (!Number.isFinite(amountN) || amountN <= 0) {
      (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, lastActionError: "Invalid bet amount" }));
      return;
    }

    (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, placing: true, lastActionError: null }));

    if (simulationActive) {
      try {
        const dedupeKey = `${roundId}_${panelIdx}`;
        if (simBetKeysRef.current.has(dedupeKey)) {
          throw new Error("Already placed for this round");
        }
        simBetKeysRef.current.add(dedupeKey);
        const bal = parsePositiveNumber(wallet ?? "0");
        if (!Number.isFinite(bal) || bal + 1e-9 < amountN) {
          simBetKeysRef.current.delete(dedupeKey);
          throw new Error("Insufficient balance");
        }
        const nextBal = Math.round((bal - amountN) * 100) / 100;
        setWallet(nextBal.toFixed(2));
        (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, placedRoundId: roundId }));
        const now = Date.now();
        setBets((prev) => [
          {
            id: `me_${panelIdx}_${now}`,
            player: myUserLabel,
            betInr: amountN,
            cashoutX: null,
            winInr: 0,
            status: "pending",
            createdAt: now,
          },
          ...prev,
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Bet failed";
        const dedupeKey = `${roundId}_${panelIdx}`;
        if (msg !== "Already placed for this round") simBetKeysRef.current.delete(dedupeKey);
        (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, lastActionError: msg }));
      } finally {
        (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, placing: false }));
      }
      return;
    }

    try {
      const res = await placeBet({ round_id: roundId, bet_amount: String(amountN) });
      setWallet(res.profile.fake_wallet_balance);
      // Live: one bet per user per round — both panels share active bet for cashout UX.
      setPanel1((p) => ({ ...p, placedRoundId: roundId }));
      setPanel2((p) => ({ ...p, placedRoundId: roundId }));
      const now = Date.now();
      setBets((prev) => [
        {
          id: `me_${panelIdx}_${now}`,
          player: myUserLabel,
          betInr: amountN,
          cashoutX: null,
          winInr: 0,
          status: "pending",
          createdAt: now,
        },
        ...prev,
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bet failed";
      (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, lastActionError: msg }));
    } finally {
      (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, placing: false }));
    }
  }, [myUserLabel, panel1, panel2, roundId, simulationActive, status, wallet]);

  const doCashout = useCallback(async (panelIdx: 1 | 2) => {
    if (!roundId || status !== "flying") return;
    const state = panelIdx === 1 ? panel1 : panel2;
    if (state.cashing) return;
    if (state.cashedRoundId === roundId) return;
    const hasBet =
      panel1.placedRoundId === roundId || panel2.placedRoundId === roundId;
    if (!simulationActive && !hasBet) {
      (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({
        ...p,
        lastActionError: "Place a bet first",
      }));
      return;
    }

    (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, cashing: true, lastActionError: null }));

    if (simulationActive) {
      const dedupeKey = `${roundId}_${panelIdx}`;
      try {
        if (simCashoutKeysRef.current.has(dedupeKey)) {
          throw new Error("Already cashed this round");
        }
        simCashoutKeysRef.current.add(dedupeKey);
        const x = multiplier;
        let payout = 0;
        let found = false;
        setBets((prev) => {
          const idx = prev.findIndex((r) => r.player === myUserLabel && r.status === "pending");
          if (idx < 0) return prev;
          found = true;
          const row = prev[idx]!;
          payout = Math.round(row.betInr * x * 100) / 100;
          const updated = {
            ...row,
            status: "won" as const,
            cashoutX: Math.round(x * 100) / 100,
            winInr: payout,
          };
          const copy = prev.slice();
          copy[idx] = updated;
          return copy;
        });
        if (!found) {
          simCashoutKeysRef.current.delete(dedupeKey);
          throw new Error("No active bet");
        }
        setWallet((wp) => {
          const bal = parsePositiveNumber(wp ?? "0");
          return (Math.round((bal + payout) * 100) / 100).toFixed(2);
        });
        (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, cashedRoundId: roundId }));
        setWinOverlay({
          show: true,
          amount: payout,
          multiplier: x,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Cashout failed";
        if (msg !== "Already cashed this round") simCashoutKeysRef.current.delete(dedupeKey);
        (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, lastActionError: msg }));
      } finally {
        (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, cashing: false }));
      }
      return;
    }

    try {
      const res = await cashout({ round_id: roundId });
      setWallet(res.profile.fake_wallet_balance);
      setPanel1((p) => ({ ...p, cashedRoundId: roundId }));
      setPanel2((p) => ({ ...p, cashedRoundId: roundId }));
      const x = Number(res.bet.cashout_multiplier ?? multiplier);
      const winInr = Number(res.bet.payout_amount ?? 0);
      setBets((prev) => {
        const idx = prev.findIndex((r) => r.player === myUserLabel && r.status === "pending");
        if (idx < 0) return prev;
        const row = prev[idx]!;
        const updated = {
          ...row,
          status: "won" as const,
          cashoutX: Math.round(x * 100) / 100,
          winInr: Math.round(winInr * 100) / 100,
        };
        const copy = prev.slice();
        copy[idx] = updated;
        return copy;
      });
      if (winInr > 0) {
        setWinOverlay({
          show: true,
          amount: winInr,
          multiplier: x,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cashout failed";
      (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, lastActionError: msg }));
    } finally {
      (panelIdx === 1 ? setPanel1 : setPanel2)((p) => ({ ...p, cashing: false }));
    }
  }, [multiplier, myUserLabel, panel1, panel2, roundId, simulationActive, status]);

  const maybeAutoBet = useCallback(
    async (panelIdx: 1 | 2) => {
      const p = panelIdx === 1 ? panel1 : panel2;
      if (p.mode !== "auto" || !p.autoBetEnabled) return;
      if (!roundId) return;
      if (p.placedRoundId === roundId) return;
      // Live backend: only one bet per user per round (panel 1 places, panel 2 skips).
      if (!simulationActive && panelIdx === 2) return;
      await doPlaceBet(panelIdx);
    },
    [doPlaceBet, panel1, panel2, roundId, simulationActive]
  );

  const maybeAutoCashout = useCallback(
    async (panelIdx: 1 | 2, currentX: number) => {
      const p = panelIdx === 1 ? panel1 : panel2;
      if (p.mode !== "auto" || !p.autoCashoutEnabled) return;
      if (!roundId) return;
      if (p.cashedRoundId === roundId) return;
      const hasBet =
        panel1.placedRoundId === roundId || panel2.placedRoundId === roundId;
      if (!hasBet) return;
      const target = parsePositiveNumber(p.autoCashoutAt);
      if (!Number.isFinite(target) || target <= 1) return;
      if (currentX >= target) await doCashout(panelIdx);
    },
    [doCashout, panel1, panel2, roundId]
  );

  useEffect(() => {
    if (!payload || payload.status !== "waiting" || !roundId) return;
    void (async () => {
      if (lastAutoBetRoundRef.current.p1 !== roundId) {
        lastAutoBetRoundRef.current.p1 = roundId;
        await maybeAutoBet(1);
      }
      if (lastAutoBetRoundRef.current.p2 !== roundId) {
        lastAutoBetRoundRef.current.p2 = roundId;
        await maybeAutoBet(2);
      }
    })();
  }, [maybeAutoBet, payload?.status, roundId]);

  useEffect(() => {
    if (!payload || payload.status !== "flying" || !roundId) return;
    void maybeAutoCashout(1, payload.current_multiplier);
    void maybeAutoCashout(2, payload.current_multiplier);
  }, [maybeAutoCashout, payload, roundId]);

  const visibleHistoryPills = useMemo(() => history.slice(0, 8), [history]);
  const waitingSeconds = 6.0;
  const waitingPct = useMemo(() => {
    if (waitingLeft == null) return 0;
    return clamp(((waitingSeconds - waitingLeft) / waitingSeconds) * 100, 0, 100);
  }, [waitingLeft]);

  const betCountLabel = useMemo(() => {
    const n = Math.max(0, Math.min(9999, bets.length));
    return `${n}/${Math.max(n, 2465)} Bets`;
  }, [bets.length]);

  const filteredBets = useMemo(() => {
    if (betsTab === "all") return bets;
    if (betsTab === "previous") return bets.filter((b) => b.status !== "pending");
    return bets
      .filter((b) => b.status === "won")
      .slice()
      .sort((a, b) => b.winInr - a.winInr);
  }, [bets, betsTab]);

  const totalWinInr = useMemo(() => {
    if (betsTab !== "all") return null;
    const sum = bets.reduce((acc, r) => acc + (r.status === "won" ? r.winInr : 0), 0);
    return sum;
  }, [bets, betsTab]);

  const livePlayersLabel = useMemo(
    () => arenaPlayersForRound(roundId).toLocaleString("en-IN"),
    [roundId]
  );

  const persistName = useCallback((name: string) => {
    const t = name.trim();
    if (!t) return;
    setDisplayName(t);
    try {
      localStorage.setItem(LS_NAME, t);
    } catch {
      /* ignore */
    }
  }, []);

  const setMusicFlag = useCallback((v: boolean) => {
    setMusicEnabled(v);
    try {
      localStorage.setItem(LS_MUSIC, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setAnimationFlag = useCallback((v: boolean) => {
    setAnimationEnabled(v);
    try {
      localStorage.setItem(LS_ANIM, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const handleNameBlur = useCallback(() => {
    const t = displayName.trim();
    if (t) {
      persistName(t);
      return;
    }
    const rnd = randomDisplayName();
    setDisplayName(rnd);
    persistName(rnd);
  }, [displayName, persistName]);

  return (
    <div className={["h-dvh w-full overflow-hidden text-zinc-50", APP_CHROME_BG].join(" ")}>
      <audio ref={musicAudioRef} src={AVIATOR_MUSIC_SRC} preload="auto" />

      <div className="mx-auto h-full w-full max-w-[430px] min-w-0">
        <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#050506] sm:rounded-[28px] sm:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.55)] sm:ring-1 sm:ring-white/10">
          <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#050506]/96 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-[72px] shrink-0 text-[17px] font-extrabold italic tracking-tight text-[#e93d52]">Aviator</div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex max-w-[148px] items-center gap-1.5 rounded-full bg-[#16171c] px-2.5 py-1.5 ring-1 ring-white/10">
                  <span className={["h-2 w-2 shrink-0 rounded-full", connected ? "bg-emerald-400" : "bg-zinc-600"].join(" ")} />
                  <span className="truncate text-[13px] font-bold tracking-tight text-[#39ef65] tabular-nums">
                    {wallet != null ? `${wallet} INR` : "0.00 INR"}
                  </span>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#16171c] text-white/80 ring-1 ring-white/10 active:opacity-95"
                  aria-label="Menu"
                  onClick={() => setMenuOpen(true)}
                >
                  <MenuLinesIcon />
                </button>
              </div>
            </div>

            <div className="px-3 pb-1.5">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                  {visibleHistoryPills.map((x, i) => {
                    const hot =
                      x < 2 ? "text-[#78c8ff]" : x < 10 ? "text-[#d4b8ff]" : "text-[#ff7b9d]";
                    return (
                      <span
                        key={`${i}_${x}`}
                        className={[
                          "rounded-full bg-[#1a1c22] px-2 py-[3px] text-[10px] font-bold tabular-nums ring-1 ring-white/[0.08]",
                          hot,
                        ].join(" ")}
                      >
                        {formatX(x)}
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg bg-[#16171c] ring-1 ring-white/10"
                  aria-label="Round history"
                >
                  <span className="text-[13px] leading-none text-white/70">⋯</span>
                </button>
              </div>
            </div>
          </div>

          {simulationActive ? (
            <div className="mx-4 mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[12px] font-semibold leading-snug text-amber-100/95">
              Demo mode — local wallet. Run{" "}
              <span className="font-mono text-amber-50/95">docker compose up</span> and connect WebSocket at{" "}
              <span className="font-mono text-amber-50/95">{WS_URL}</span> for live rounds and real bets.
            </div>
          ) : lastError ? (
            <div className="mx-4 mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {lastError}
            </div>
          ) : null}

          <div className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4">
            <div className="px-3 pt-3">
              <div className={["relative overflow-hidden rounded-[14px] bg-[#030304] ring-1 ring-white/[0.07]", crashed ? "ring-rose-500/25" : ""].join(" ")}>
                <div className="relative h-[clamp(212px,34dvh,312px)] w-full sm:h-[clamp(232px,35dvh,352px)]">
                  <div className="absolute inset-0 bg-[#020203]" />
                  <div className="absolute inset-0 overflow-hidden rounded-[14px]">
                    <div className="aviator-rays-anchor">
                      <div className="aviator-rays-rotor" />
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 transition-opacity duration-700 ease-out ${flying ? "opacity-100" : "opacity-[0.78]"} aviator-arena-blue-haze`}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_35%,rgba(155,105,235,0.18),transparent_55%)]" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-black/20" />
                  {animationEnabled ? (
                    <div className="absolute inset-0 z-[1] opacity-95">
                      <AviatorCurve phase={waiting ? "waiting" : flying ? "flying" : "crashed"} multiplier={multiplier} />
                    </div>
                  ) : null}

                  {!waiting ? (
                    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
                      <div className="text-center">
                        {crashed ? (
                          <div className="mb-1 text-[15px] font-black tracking-tight text-white/90">FLEW AWAY!</div>
                        ) : null}
                        {!waiting ? (
                          <div
                            id="aviator-live-multiplier"
                            className={[
                              "relative text-[52px] font-black leading-none tracking-tight sm:text-[60px]",
                              "drop-shadow-[0_2px_0_rgba(0,0,0,0.9)] drop-shadow-[0_4px_28px_rgba(0,0,0,0.75)]",
                              crashed ? "text-[#ff3b5c]" : "text-white",
                            ].join(" ")}
                          >
                            {formatX(multiplier)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {animationEnabled ? (
                    <div className="pointer-events-none absolute right-2 bottom-2 z-[3] flex items-center rounded-full bg-black/50 px-1.5 py-1 ring-1 ring-white/10 backdrop-blur-[2px]">
                      <div className="flex -space-x-1.5 pr-1.5">
                        {["from-sky-400 to-indigo-500", "from-fuchsia-400 to-orange-400", "from-emerald-400 to-cyan-500"].map(
                          (grad, i) => (
                            <span
                              key={`lp_${i}`}
                              className={["h-4 w-4 rounded-full ring-1 ring-black/55 bg-linear-to-br", grad].join(" ")}
                            />
                          )
                        )}
                      </div>
                      <span className="text-[9px] font-bold tabular-nums text-white/85">{livePlayersLabel}</span>
                    </div>
                  ) : null}

                  {waiting && waitingLeft != null ? (
                    <div className="absolute top-3 right-3 left-3 z-[3]">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-white/72">
                        <span>Starting in</span>
                        <span className="tabular-nums">{waitingLeft.toFixed(1)}s</span>
                      </div>
                      <div className="mt-2 h-[5px] w-full rounded-full bg-white/10">
                        <div className="h-[5px] rounded-full bg-[#28a909] transition-[width] duration-300 ease-out" style={{ width: `${waitingPct}%` }} />
                      </div>
                    </div>
                  ) : null}

                  {waiting && ((panel1.placedRoundId === roundId && !panel1.cashedRoundId) || (panel2.placedRoundId === roundId && !panel2.cashedRoundId)) ? (
                    <div className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none mt-10">
                      <div className="bg-[#28a909]/20 text-[#39ef65] border border-[#28a909]/40 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(40,169,9,0.3)] backdrop-blur-sm animate-pulse">
                        BET ACCEPTED
                      </div>
                    </div>
                  ) : null}

                  {winOverlay?.show && (
                    <div className="absolute top-12 left-0 right-0 z-[10] flex justify-center pointer-events-none">
                      <div className="bg-[#28a909]/20 text-[#39ef65] border border-[#28a909]/40 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(40,169,9,0.3)] backdrop-blur-sm animate-pulse flex items-center gap-1.5">
                        <span>YOU WON ₹{fmtINR(winOverlay.amount)}</span>
                        <span className="text-[#ffdc2b] font-black bg-black/45 px-1 py-0.2 rounded text-[10px] tracking-tight">{formatX(winOverlay.multiplier)}</span>
                      </div>
                    </div>
                  )}

                  {lossOverlay?.show && (
                    <div className="absolute top-12 left-0 right-0 z-[10] flex justify-center pointer-events-none">
                      <div className="bg-rose-500/20 text-[#ff4d6a] border border-rose-500/40 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(220,38,38,0.25)] backdrop-blur-sm animate-pulse">
                        YOU LOST ₹{fmtINR(lossOverlay.amount)}
                      </div>
                    </div>
                  )}


                </div>
              </div>
            </div>

            <div className="mt-3 space-y-3 px-3">
              <BetPanel
                state={panel1}
                setState={setPanel1}
                canBet={status === "waiting" && !!roundId}
                canCashout={status === "flying" && !!roundId}
                onBet={() => void doPlaceBet(1)}
                onCashout={() => void doCashout(1)}
                toggleAction={!showPanel2 ? { label: "+", onClick: () => setShowPanel2(true) } : undefined}
                roundId={roundId}
                status={status}
              />
              {showPanel2 && (
                <BetPanel
                  state={panel2}
                  setState={setPanel2}
                  canBet={status === "waiting" && !!roundId}
                  canCashout={status === "flying" && !!roundId}
                  onBet={() => void doPlaceBet(2)}
                  onCashout={() => void doCashout(2)}
                  toggleAction={{ label: "−", onClick: () => setShowPanel2(false) }}
                  roundId={roundId}
                  status={status}
                />
              )}
            </div>

            <div className="mt-3 px-3">
              <div className="rounded-[22px] bg-[#12121a] ring-1 ring-white/10">
                <div className="flex items-center justify-between px-3 pt-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setBetsTab("all")} className={["rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-white/10", betsTab === "all" ? "bg-white/10 text-white" : "bg-white/5 text-white/65"].join(" ")}>
                      All Bets
                    </button>
                    <button type="button" onClick={() => setBetsTab("previous")} className={["rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-white/10", betsTab === "previous" ? "bg-white/10 text-white" : "bg-white/5 text-white/65"].join(" ")}>
                      Previous
                    </button>
                    <button type="button" onClick={() => setBetsTab("top")} className={["rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-white/10", betsTab === "top" ? "bg-white/10 text-white" : "bg-white/5 text-white/65"].join(" ")}>
                      Top
                    </button>
                  </div>

                  <div className="text-right text-xs">
                    <div className="font-bold text-white/80">{betsTab === "all" ? betCountLabel : ""}</div>
                    <div className="text-[11px] font-semibold text-white/55">
                      {totalWinInr != null ? (
                        <>
                          <span className="tabular-nums">{fmtINR(totalWinInr)}</span> <span className="opacity-80">Total win INR</span>
                        </>
                      ) : (
                        <span className="opacity-70"> </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-white/10 px-3 py-2 text-[11px] font-semibold text-white/55">
                  <div className="grid grid-cols-[1.2fr_0.9fr_0.6fr_0.9fr] gap-2">
                    <div>Player</div>
                    <div className="text-right">Bet INR</div>
                    <div className="text-right">X</div>
                    <div className="text-right">Win INR</div>
                  </div>
                </div>

                <div className="max-h-[330px] overflow-y-auto pb-2 pt-2">
                  {filteredBets.slice(0, 80).map((r) => {
                    const highlight = r.status === "won";
                    return (
                      <div key={r.id} className="px-3">
                        <div className={["grid grid-cols-[1.2fr_0.9fr_0.6fr_0.9fr] items-center gap-2 rounded-2xl px-3 py-2.5 text-sm ring-1", highlight ? "bg-emerald-500/12 ring-emerald-500/20" : "bg-white/5 ring-white/10"].join(" ")}>
                          <div className="min-w-0 truncate text-xs font-bold text-white/80">{r.player}</div>
                          <div className="text-right text-xs font-bold tabular-nums text-white/80">{fmtINR(r.betInr)}</div>
                          <div className="text-right text-xs font-black tabular-nums text-white/70">{r.cashoutX ? formatX(r.cashoutX) : ""}</div>
                          <div className="text-right text-xs font-black tabular-nums text-white/85">{r.winInr ? fmtINR(r.winInr) : "0.00"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {menuOpen ? (
            <div
              className="absolute inset-0 z-[45] bg-black/60 px-4 pt-14 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
              role="presentation"
            >
              <div
                className="mx-auto w-full max-w-[360px] rounded-[22px] bg-[#1a1b20] px-4 py-4 ring-1 ring-white/12 shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="menu-title"
              >
                <div className="flex items-center justify-between">
                  <div id="menu-title" className="text-[15px] font-extrabold text-white/95">
                    Menu
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.06] text-lg leading-none text-white/70 ring-1 ring-white/10"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="mt-5">
                  <label className="block text-[11px] font-semibold text-white/45" htmlFor="aviator-display-name">
                    Name
                  </label>
                  <input
                    id="aviator-display-name"
                    type="text"
                    autoComplete="nickname"
                    className="mt-1.5 w-full rounded-[14px] border border-white/[0.08] bg-black/35 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-0 placeholder:text-white/30 focus:border-[#28a909]/55 focus:ring-[3px] focus:ring-[#28a909]/15"
                    value={displayName}
                    placeholder="Enter a name"
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={handleNameBlur}
                  />
                </div>

                <div className="mt-5 space-y-3 border-t border-white/[0.08] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-bold text-white/85">Music</div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={musicEnabled}
                      aria-label="Music"
                      onClick={() => setMusicFlag(!musicEnabled)}
                      className={[
                        "inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] ring-1 ring-white/10 transition-colors",
                        musicEnabled ? "justify-end bg-[#28a909]" : "justify-start bg-white/[0.16]",
                      ].join(" ")}
                    >
                      <span className="h-6 w-6 rounded-full bg-white shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-bold text-white/85">Animation</div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={animationEnabled}
                      aria-label="Animation"
                      onClick={() => setAnimationFlag(!animationEnabled)}
                      className={[
                        "inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] ring-1 ring-white/10 transition-colors",
                        animationEnabled ? "justify-end bg-[#28a909]" : "justify-start bg-white/[0.16]",
                      ].join(" ")}
                    >
                      <span className="h-6 w-6 rounded-full bg-white shadow" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {historyOpen ? (
            <div
              className="absolute inset-0 z-30 flex items-start justify-center bg-black/55 px-4 pt-14 backdrop-blur-sm"
              onClick={() => setHistoryOpen(false)}
              role="presentation"
            >
              <div
                className="w-full max-w-[410px] rounded-[26px] bg-[#12121a] p-4 ring-1 ring-white/12 shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="round-history-title"
              >
                <div className="flex items-center justify-between gap-3">
                  <div id="round-history-title" className="text-sm font-extrabold text-white/90">
                    Round History
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold leading-none text-white/85 ring-1 ring-white/15 active:scale-[0.98]"
                    onClick={() => setHistoryOpen(false)}
                    aria-label="Close round history"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {history.slice(0, 30).map((x, i) => {
                    const hot = x < 2 ? "text-sky-300" : x < 10 ? "text-violet-300" : "text-rose-300";
                    return (
                      <span key={`${i}_${x}`} className={["rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold tabular-nums ring-1 ring-white/10", hot].join(" ")}>
                        {formatX(x)}
                      </span>
                    );
                  })}
                  {history.length === 0 ? <div className="text-xs font-semibold text-white/55">Waiting for data…</div> : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Flight curve — real Aviator-style exponential ─── */
const ARENA_VB_W = 360;
const ARENA_VB_H = 240;
const CURVE_PAD_BOTTOM = 0; // flush with bottom
const CURVE_PAD_TOP = 80; 
const CURVE_PAD_LEFT = 0; // flush with left
const CURVE_PAD_RIGHT = 80; 
const CURVE_STROKE_W = 4;

/* Plane sprite config */
const PLANE_TAIL_X = 0.29;
const PLANE_TAIL_Y = 0.68;
const PLANE_SIZE = 95;

/* Same formula as aviator-simulation.ts */
const MULT_A = 0.0035;
const MULT_B = 0.012;
function multAtTime(t: number) { return Math.exp(MULT_A * t * t + MULT_B * t); }
function timeForMult(m: number) {
  if (m <= 1) return 0;
  const lnM = Math.log(m);
  const disc = MULT_B * MULT_B + 4 * MULT_A * lnM;
  return disc < 0 ? 0 : (-MULT_B + Math.sqrt(disc)) / (2 * MULT_A);
}

/** Build smooth SVG path from points using Catmull-Rom */
function smoothPathD(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const t = 0.3;
    d += ` C${(p1.x + (p2.x - p0.x) * t).toFixed(1)} ${(p1.y + (p2.y - p0.y) * t).toFixed(1)},${(p2.x - (p3.x - p1.x) * t).toFixed(1)} ${(p2.y - (p3.y - p1.y) * t).toFixed(1)},${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function AviatorCurve({ phase, multiplier }: { phase: "waiting" | "flying" | "crashed"; multiplier: number }) {
  const strokeRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<SVGGElement>(null);

  const phaseRef = useRef(phase);
  const multRef = useRef(multiplier);
  const animMultRef = useRef(1.0);
  phaseRef.current = phase;
  multRef.current = multiplier;

  useEffect(() => {
    if (phase === "waiting") animMultRef.current = 1.0;
  }, [phase]);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let lastMs = performance.now();

    const usableW = ARENA_VB_W - CURVE_PAD_LEFT - CURVE_PAD_RIGHT;
    const usableH = ARENA_VB_H - CURVE_PAD_BOTTOM - CURVE_PAD_TOP;
    const baseY = ARENA_VB_H - CURVE_PAD_BOTTOM;

    // View window stays fixed for the first ~7.0 seconds (until plane hits top right)
    const FIX_WINDOW_X_MAX = 7.0; 
    

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - lastMs) / 1000);
      lastMs = now;

      const curPhase = phaseRef.current;
      const targetMult = curPhase === "flying" ? multRef.current : 1.0;

      if (curPhase === "flying") {
        // Calculate the current flight time based on the active multiplier
        let currentT = timeForMult(animMultRef.current);
        currentT += dt; // Continually advance time for perfectly smooth 60fps motion
        
        const targetT = timeForMult(targetMult);
        
        // Smoothly correct any drift between our local extrapolated time and the true backend time
        if (currentT < targetT) {
          currentT += (targetT - currentT) * 0.1;
        } else if (currentT > targetT + 0.5) {
          currentT = targetT + 0.5;
        }
        
        animMultRef.current = multAtTime(currentT);
      } else {
        const cur = animMultRef.current;
        const k = 1 - Math.exp(-12 * dt);
        animMultRef.current = cur + (targetMult - cur) * k;
        if (Math.abs(targetMult - animMultRef.current) < 0.0005) {
          animMultRef.current = targetMult;
        }
      }

      const m = animMultRef.current;
      const isFlying = curPhase === "flying";

      // Directly update the big text multiplier element in the DOM at 60fps
      const liveTextEl = document.getElementById("aviator-live-multiplier");
      if (liveTextEl) {
        if (isFlying) {
          liveTextEl.innerText = `${m.toFixed(2)}x`;
        } else if (curPhase === "crashed") {
          // Force the correct final crash point when crashed so it matches round history exactly
          liveTextEl.innerText = `${multRef.current.toFixed(2)}x`;
        }
      }

      if (m <= 1.002 || !isFlying) {
        strokeRef.current?.setAttribute("d", "");
        fillRef.current?.setAttribute("d", "");
        planeRef.current?.setAttribute("opacity", "0");
        raf = requestAnimationFrame(tick);
        return;
      }

      planeRef.current?.setAttribute("opacity", "1");

      const t = timeForMult(m);
      const viewXMax = Math.max(FIX_WINDOW_X_MAX, t);

      const steps = 50;
      const pts: { x: number; y: number }[] = [];

      // Only apply the bobbing animation when the plane reaches the top (t >= FIX_WINDOW_X_MAX)
      // We use a smooth ramp-up to prevent sudden jumps
      const bobIntensity = Math.max(0, Math.min(1, (t - (FIX_WINDOW_X_MAX - 1.5)) / 1.5));
      const bobY = isFlying ? Math.sin(now / 400) * 4 * bobIntensity : 0;
      const bobX = isFlying ? Math.cos(now / 500) * 2.5 * bobIntensity : 0;

      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const pointT = frac * t; 
        
        const xFrac = pointT / viewXMax;
        
        // Use a power curve so it rises diagonally through the center numbers
        const yFrac = Math.pow(xFrac, 1.6);
        
        const x = CURVE_PAD_LEFT + xFrac * usableW + bobX * xFrac;
        const y = baseY - yFrac * usableH + bobY * xFrac;
        pts.push({ x, y });
      }

      const curveD = smoothPathD(pts);
      const tip = pts[pts.length - 1];

      strokeRef.current?.setAttribute("d", curveD);

      const fillD = `${curveD} L${tip.x.toFixed(1)} ${baseY} L${pts[0].x.toFixed(1)} ${baseY} Z`;
      fillRef.current?.setAttribute("d", fillD);

      /* ── Plane position & angle ── */
      // User explicitly requested NO curve rotation ("plan ko jesa he same vesa rakho")
      // We rely entirely on the PNG's built-in tilt for the angle.
      const planeAngle = 0;

      planeRef.current?.setAttribute(
        "transform",
        `translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)}) rotate(${planeAngle})`
      );

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  const planeX = -PLANE_SIZE * PLANE_TAIL_X;
  const planeY = -PLANE_SIZE * PLANE_TAIL_Y;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Set overflow visible on SVG so the plane is fully visible even if it starts perfectly at x=0 */}
      <svg
        viewBox={`0 0 ${ARENA_VB_W} ${ARENA_VB_H}`}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id="curveRed2" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#ff3b5c" />
            <stop offset="1" stopColor="#ff1744" />
          </linearGradient>
          {/* True vertical fill gradient starting from top to bottom */}
          <linearGradient id="curveFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(223, 21, 57, 0.55)" />
            <stop offset="1" stopColor="rgba(223, 21, 57, 0.45)" />
          </linearGradient>
        </defs>
        <g>
          {/* Area beneath the curve */}
          <path ref={fillRef} d="" fill="url(#curveFillGrad)" />
          
          {/* Curve line */}
          <path
            ref={strokeRef}
            d=""
            fill="none"
            stroke="url(#curveRed2)"
            strokeWidth={CURVE_STROKE_W}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Plane image */}
          <g
            ref={planeRef}
            opacity={0}
            style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
          >
            <image
              href="/plan.png"
              x={planeX}
              y={planeY}
              width={PLANE_SIZE}
              height={PLANE_SIZE}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

function ToggleSwitch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={[
        "h-5 w-9 shrink-0 rounded-full p-0.5 ring-1 ring-white/10 transition-colors",
        on ? "bg-[#28a909]" : "bg-white/10",
      ].join(" ")}
    >
      <span
        className={[
          "block h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

function MenuLinesIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden className="text-white/85">
      <path d="M1 1.25h16M1 7h16M1 12.75h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="text-white/90">
      <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function BetPanel({
  state,
  setState,
  canBet,
  canCashout,
  onBet,
  onCashout,
  toggleAction,
  roundId,
  status,
}: {
  state: BetPanelState;
  setState: React.Dispatch<React.SetStateAction<BetPanelState>>;
  canBet: boolean;
  canCashout: boolean;
  onBet: () => void;
  onCashout: () => void;
  toggleAction?: { label: string; onClick: () => void };
  roundId: number | null;
  status: string;
}) {
  const disabled = state.placing || state.cashing;
  const amountN = parsePositiveNumber(state.amount);
  const amountLabel = Number.isFinite(amountN) ? fmtINR(amountN) : state.amount;
  const autoEnabled = state.mode === "auto";

  // Logic for button color and text
  const isBetForNextRound = state.placedRoundId != null && status === "flying" && state.placedRoundId !== roundId;
  const isPlacedForCurrent = state.placedRoundId === roundId;
  const isCashedOut = state.cashedRoundId === roundId;
  
  let btnBg = "bg-[#28a909] ring-[#28a909]/40";
  let btnText = "Bet";
  let btnAction = canBet ? onBet : undefined;
  let btnOpacity = !canBet && !canCashout ? "opacity-50" : "";

  if (isCashedOut) {
    btnBg = "bg-emerald-900/60 ring-emerald-500/30 text-emerald-200/70";
    btnText = "Cashed Out";
    btnAction = undefined;
    btnOpacity = "";
  } else if (isBetForNextRound) {
    btnBg = "bg-[#e93d52] ring-[#e93d52]/40";
    btnText = "Waiting for next round";
    btnAction = undefined; // Can't cancel yet in this simplified version
  } else if (isPlacedForCurrent) {
    if (status === "waiting") {
      btnBg = "bg-[#e93d52] ring-[#e93d52]/40";
      btnText = "Bet Placed";
      btnAction = undefined; 
    } else if (status === "flying") {
      btnBg = "bg-[#d9a20a] ring-[#d9a20a]/40";
      btnText = "Cash Out";
      btnAction = canCashout ? onCashout : undefined;
      btnOpacity = "";
    } else if (status === "crashed") {
      btnBg = "bg-rose-950/80 ring-rose-900/50 text-rose-300/60";
      btnText = "Bet Lost";
      btnAction = undefined;
      btnOpacity = "";
    }
  } else {
    // Not placed
    if (status === "flying" || status === "crashed") {
      btnBg = "bg-black/40 ring-white/5 text-white/40";
      btnText = "Wait for next round";
      btnAction = undefined;
      btnOpacity = "";
    }
  }

  return (
    <div className="overflow-hidden rounded-[16px] bg-[#1a1b1d] p-2 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-full bg-black/35 ring-1 ring-white/10">
          <button type="button" onClick={() => setState((p) => ({ ...p, mode: "bet" }))} className={["h-7 px-4 text-[10px] font-extrabold", state.mode === "bet" ? "bg-white/10 text-white" : "text-white/65"].join(" ")}>
            Bet
          </button>
          <button type="button" onClick={() => setState((p) => ({ ...p, mode: "auto" }))} className={["h-7 px-4 text-[10px] font-extrabold", state.mode === "auto" ? "bg-white/10 text-white" : "text-white/65"].join(" ")}>
            Auto
          </button>
        </div>

        {toggleAction ? (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-lg font-bold text-white/80 ring-1 ring-white/10 active:scale-95"
            onClick={toggleAction.onClick}
          >
            {toggleAction.label}
          </button>
        ) : (
          <div className="h-7 w-7" />
        )}
      </div>

      <div className="mt-2 grid grid-cols-[132px_1fr] gap-2">
        <div className="rounded-[14px] bg-black/25 p-1.5 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="h-6 w-8 rounded-2xl bg-white/5 text-xs text-white/80 ring-1 ring-white/10 active:scale-[0.99]"
              onClick={() =>
                setState((p) => {
                  const n = parsePositiveNumber(p.amount);
                  const next = Number.isFinite(n) ? Math.max(0, n - 1) : 0;
                  return { ...p, amount: next.toFixed(2) };
                })
              }
              disabled={disabled}
            >
              −
            </button>
            <div className="min-w-0 px-2 text-center">
              <div className="text-[11px] font-bold tabular-nums text-white/85">{amountLabel}</div>
            </div>
            <button
              type="button"
              className="h-6 w-8 rounded-2xl bg-white/5 text-xs text-white/80 ring-1 ring-white/10 active:scale-[0.99]"
              onClick={() =>
                setState((p) => {
                  const n = parsePositiveNumber(p.amount);
                  const next = Number.isFinite(n) ? n + 1 : 10;
                  return { ...p, amount: next.toFixed(2) };
                })
              }
              disabled={disabled}
            >
              +
            </button>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {betQuickChipRow().map((c) => (
              <button
                key={c}
                type="button"
                className="h-6 rounded-2xl bg-white/5 text-[10px] font-bold tabular-nums text-white/70 ring-1 ring-white/10 active:scale-[0.99]"
                onClick={() => setState((p) => ({ ...p, amount: Number(c).toFixed(2) }))}
                disabled={disabled}
              >
                {c.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={[
            "relative h-[78px] rounded-[12px] px-3 py-2 text-left ring-1 active:scale-[0.99] transition-opacity",
            btnBg,
            btnOpacity,
          ].join(" ")}
          onClick={() => {
            if (btnAction) btnAction();
          }}
          disabled={disabled || !btnAction}
        >
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-[18px] font-black leading-tight text-white">
              {btnText}
            </div>
            {btnText === "Cash Out" || btnText === "Bet" ? (
              <div className="text-[14px] font-black leading-tight text-white/95">
                {state.amount} <span className="text-[11px] font-bold text-white/80">INR</span>
              </div>
            ) : null}
          </div>
        </button>
      </div>

      {autoEnabled ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[14px] bg-black/25 px-2.5 py-2 ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/65">Auto bet</span>
            <ToggleSwitch
              on={state.autoBetEnabled}
              onChange={() => setState((p) => ({ ...p, autoBetEnabled: !p.autoBetEnabled }))}
              label="Auto bet"
            />
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="text-[10px] font-bold text-white/65">Auto Cash Out</span>
            <ToggleSwitch
              on={state.autoCashoutEnabled}
              onChange={() => setState((p) => ({ ...p, autoCashoutEnabled: !p.autoCashoutEnabled }))}
              label="Auto cash out"
            />
            <input
              value={state.autoCashoutAt}
              onChange={(e) => setState((p) => ({ ...p, autoCashoutAt: e.target.value }))}
              inputMode="decimal"
              className="h-6 w-12 shrink-0 rounded-lg bg-black/40 px-1.5 text-center text-[10px] font-bold tabular-nums text-white/85 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#28a909]/40"
            />
            <span className="text-[10px] font-black text-white/60">x</span>
          </div>
        </div>
      ) : null}

      {state.lastActionError ? (
        <div className="mt-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100/90">{state.lastActionError}</div>
      ) : null}
    </div>
  );
}

