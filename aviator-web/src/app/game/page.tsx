"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_CHROME_BG } from "@/components/layout/AppChrome";
import { WS_URL } from "@/lib/ws";
import { cancelBet, cashout, fetchGameState, fetchMe, placeBet, type GameStateResponse } from "@/lib/api";
import { startAviatorSimulation } from "@/lib/aviator-simulation";
import { crashForRound } from "@/data/crash-sequence";
import { buildRoundBets, crowdCashed, crowdTotal, PLAYER_FACES, settleBotsAtMultiplier, type LiveBetRow } from "@/lib/live-round-bets";

const FORCE_AVIATOR_SIM = false;
const ALLOW_SIM_FALLBACK = false;

type WaitingPayload = { status: "waiting"; time_left: number; round_id: number; round_number: number };
type FlyingPayload = { status: "flying"; current_multiplier: number; round_id: number; round_number: number };
type CrashedPayload = { status: "crashed"; crash_point: number; round_id: number; round_number: number };
type GamePayload = WaitingPayload | FlyingPayload | CrashedPayload;

function formatX(v: number) {
  return `${v.toFixed(2)}x`;
}

function playTone(freq: number, dur = 0.12) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    window.setTimeout(() => void ctx.close(), (dur + 0.05) * 1000);
  } catch {
    /* ignore */
  }
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
  /** Stake captured when the bet was placed. Payout math uses this, not later edits. */
  lockedStake: number | null;
  /** Armed during flight for the following round. Cancellable until that round opens. */
  queuedForNext: boolean;
};

type BetsTab = "all" | "previous" | "top";
type BetRow = LiveBetRow;

type PreviousRoundSnap = {
  roundId: number;
  crashPoint: number;
  rows: BetRow[];
  totalPlayers: number;
  cashedCount: number;
  cashedAmount: number;
};

type MyBetRecord = {
  id: string;
  roundId: number;
  panel: 1 | 2;
  stake: number;
  cashoutX: number | null;
  winInr: number;
  status: "won" | "lost";
  at: number;
};

type MenuPage = "root" | "avatar" | "free" | "history" | "limits" | "howto" | "rules" | "fair";

const AVATARS = PLAYER_FACES;

function PlayerFace({ src }: { src?: string }) {
  const photo = src && (src.startsWith("/") || src.startsWith("http")) ? src : AVATARS[0];
  return (
    <span
      className="h-6 w-6 shrink-0 rounded-full bg-cover bg-center ring-1 ring-black/40"
      style={{ backgroundImage: `url("${photo}")` }}
      aria-hidden
    />
  );
}

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

function betQuickChipRow() {
  return [100, 200, 500, 1000];
}



const MY_BETS_KEY = "aviator_my_bets";

function loadMyBets(): MyBetRecord[] {
  try {
    const raw = localStorage.getItem(MY_BETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MyBetRecord[];
    return Array.isArray(parsed) ? parsed.slice(0, 80) : [];
  } catch {
    return [];
  }
}

function saveMyBets(rows: MyBetRecord[]) {
  try {
    localStorage.setItem(MY_BETS_KEY, JSON.stringify(rows.slice(0, 80)));
  } catch {
    /* ignore */
  }
}

function formatBetStamp(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    date: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)}`,
  };
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
const LS_SOUND = "aviator_sound";
const LS_NAME = "aviator_display_name";
const LS_AVATAR = "aviator_avatar";
const LS_CLIENT_SEED = "aviator_client_seed";

function emptyPanel(amount = "10.00"): BetPanelState {
  return {
    amount,
    mode: "bet",
    autoBetEnabled: false,
    autoCashoutEnabled: false,
    autoCashoutAt: "1.10",
    placing: false,
    cashing: false,
    lastActionError: null,
    placedRoundId: null,
    cashedRoundId: null,
    lockedStake: null,
    queuedForNext: false,
  };
}

const AVIATOR_MUSIC_SRC = "/aviator%20music.mp3";
const PLANE_CRASH_SRC = "/plancrash.mp3";
const CRASH_HOLD_MS = 3000;

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
  const [bets, setBets] = useState<BetRow[]>([]);
  const [previousRound, setPreviousRound] = useState<PreviousRoundSnap | null>(null);
  const [myBets, setMyBets] = useState<MyBetRecord[]>([]);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [booting, setBooting] = useState(false);
  const [myUserLabel] = useState<string>("You");
  const [showPanel2, setShowPanel2] = useState(true);
  const [localAdjust, setLocalAdjust] = useState(0);

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

  const [panel1, setPanel1] = useState<BetPanelState>(() => emptyPanel("10.00"));
  const [panel2, setPanel2] = useState<BetPanelState>(() => emptyPanel("10.00"));
  const panel1Ref = useRef(panel1);
  const panel2Ref = useRef(panel2);
  panel1Ref.current = panel1;
  panel2Ref.current = panel2;
  const betsRef = useRef(bets);
  betsRef.current = bets;

  const crashFlashRef = useRef(0);
  const lastRoundIdRef = useRef<number | null>(null);
  const lastAutoBetRoundRef = useRef<{ p1: number | null; p2: number | null }>({ p1: null, p2: null });
  const lastCrashKeyRef = useRef<string | null>(null);
  const heldCrashTimerRef = useRef<number | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const crashAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastCrashSoundKeyRef = useRef<string | null>(null);
  const sawFlyingRef = useRef(false);
  const wsConnectedRef = useRef(false);
  const lastRoundNumberRef = useRef(1);
  const lastCrashResolveKeyRef = useRef<string | null>(null);
  const stopSimRef = useRef<(() => void) | null>(null);
  const simStartedRef = useRef(false);
  const simBetKeysRef = useRef(new Set<string>());
  const simCashoutKeysRef = useRef(new Set<string>());
  const historySeededRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPage, setMenuPage] = useState<MenuPage>("root");
  const [simulationActive, setSimulationActive] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const avatarIdxRef = useRef(0);
  avatarIdxRef.current = avatarIdx;
  const [clientSeed, setClientSeed] = useState("aviator");
  const [displayName, setDisplayName] = useState("");
  const multiplierRef = useRef(1);
  const soundEnabledRef = useRef(true);
  soundEnabledRef.current = soundEnabled;
  const musicEnabledRef = useRef(false);
  musicEnabledRef.current = musicEnabled;

  useEffect(() => {
    try {
      const a = localStorage.getItem(LS_ANIM);
      const m = localStorage.getItem(LS_MUSIC);
      const s = localStorage.getItem(LS_SOUND);
      const n = localStorage.getItem(LS_NAME);
      const av = localStorage.getItem(LS_AVATAR);
      const seed = localStorage.getItem(LS_CLIENT_SEED);
      if (a === "0") setAnimationEnabled(false);
      if (a === "1") setAnimationEnabled(true);
      if (m === "1") setMusicEnabled(true);
      if (m === "0") setMusicEnabled(false);
      if (s === "0") setSoundEnabled(false);
      if (av && Number.isFinite(Number(av))) setAvatarIdx(Number(av) % AVATARS.length);
      if (seed) setClientSeed(seed);
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
    void el.play().catch(() => { });
  }, [musicEnabled]);

  useEffect(() => {
    let unsubscribe = () => { };
    import("@/lib/firebase").then(({ firebaseAuth }) => {
      unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
        if (FORCE_AVIATOR_SIM || simStartedRef.current) return;
        if (user) {
          fetchMe()
            .then((res) => {
              if (simStartedRef.current) return;
              setWallet(res.profile.fake_wallet_balance);
            })
            .catch(() => {
              if (!simStartedRef.current) setWallet(null);
            });
        } else {
          setWallet(null);
        }
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setMyBets(loadMyBets());
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("aviator_enter_splash") !== "1") return;
    setBooting(true);
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem("aviator_enter_splash");
      setBooting(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unlock = () => {
      const audio = crashAudioRef.current;
      window.removeEventListener("pointerdown", unlock);
      if (!audio || !audio.paused) return;
      const previous = audio.volume;
      audio.volume = 0;
      const pending = audio.play();
      if (!pending) {
        audio.volume = previous || 1;
        return;
      }
      void pending
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = previous || 1;
        })
        .catch(() => {
          audio.volume = previous || 1;
        });
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    const crashAudio = crashAudioRef.current;
    if (crashAudio && !musicEnabled && !crashAudio.paused) {
      crashAudio.pause();
      crashAudio.currentTime = 0;
    }

    const playCrash = (roundId: number, commit: boolean) => {
      const key = String(roundId);
      if (lastCrashSoundKeyRef.current === key) return;
      if (!musicEnabledRef.current || !crashAudio || !sawFlyingRef.current) {
        if (commit) lastCrashSoundKeyRef.current = key;
        return;
      }
      lastCrashSoundKeyRef.current = key;
      crashAudio.volume = 1;
      crashAudio.currentTime = 0;
      void crashAudio.play().catch(() => {});
    };

    if (payload?.status === "flying") {
      sawFlyingRef.current = true;
      return;
    }

    if (payload?.status !== "crashed") return;
    const music = musicAudioRef.current;
    if (music && musicEnabled && music.paused) {
      void music.play().catch(() => {});
    }
    if (sawFlyingRef.current) playCrash(payload.round_id, true);
  }, [payload, musicEnabled]);

  useEffect(() => {
    if (FORCE_AVIATOR_SIM) {
      simStartedRef.current = true;
      setSimulationActive(true);
      setConnected(true);
      setLastError(null);
      setWallet("10000.00");
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
      .catch(() => { });

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
          .catch(() => { });
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
  const visualPayload = heldCrash ?? activePayload ?? payload;
  const visualStatus = visualPayload?.status ?? "waiting";

  const multiplier = useMemo(() => {
    if (!visualPayload || visualPayload.status === "waiting") return 1;
    if (visualPayload.status === "flying") return visualPayload.current_multiplier;
    if (visualPayload.status === "crashed") return visualPayload.crash_point;
    return 1;
  }, [visualPayload]);
  multiplierRef.current = multiplier;

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
    }, CRASH_HOLD_MS);
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
    const roundRows = betsRef.current.filter((r) => r.roundId === payload.round_id);
    const pendingMine = roundRows.filter((r) => r.panel && r.status === "pending");
    if (pendingMine.length > 0) {
      const lostAmt = pendingMine.reduce((sum, r) => sum + r.betInr, 0);
      setLossOverlay({ show: true, amount: lostAmt });
      setMyBets((h) => {
        const next = [
          ...pendingMine.map((r) => ({
            id: `${r.id}_lost`,
            roundId: payload.round_id,
            panel: r.panel as 1 | 2,
            stake: r.betInr,
            cashoutX: null,
            winInr: 0,
            status: "lost" as const,
            at: Date.now(),
          })),
          ...h,
        ].slice(0, 80);
        saveMyBets(next);
        return next;
      });
      setPanel1((p) => (p.placedRoundId === payload.round_id && p.cashedRoundId !== payload.round_id ? { ...p, lockedStake: null, placedRoundId: null } : p));
      setPanel2((p) => (p.placedRoundId === payload.round_id && p.cashedRoundId !== payload.round_id ? { ...p, lockedStake: null, placedRoundId: null } : p));
    }
    const cashed = roundRows.filter((r) => r.status === "won");
    const crowd = crowdCashed(payload.round_id, payload.crash_point);
    setPreviousRound({
      roundId: payload.round_id,
      crashPoint: payload.crash_point,
      rows: cashed,
      totalPlayers: crowd.total,
      cashedCount: crowd.cashed,
      cashedAmount: crowd.amount,
    });
    setBets(cashed);
    if (!simulationActive) {
      void fetchMe()
        .then((res) => setWallet(res.profile.fake_wallet_balance))
        .catch(() => { });
    }
  }, [payload, simulationActive]);

  useEffect(() => {
    if (!roundId) return;
    if (lastRoundIdRef.current === roundId) return;
    lastRoundIdRef.current = roundId;
    simBetKeysRef.current.clear();
    simCashoutKeysRef.current.clear();

    const promote = (p: BetPanelState): BetPanelState => {
      if (p.queuedForNext && p.lockedStake != null) {
        return { ...p, queuedForNext: false, placedRoundId: roundId, cashedRoundId: null, lastActionError: null };
      }
      return {
        ...p,
        queuedForNext: false,
        placedRoundId: null,
        cashedRoundId: null,
        lockedStake: null,
        lastActionError: null,
      };
    };

    const n1 = promote(panel1Ref.current);
    const n2 = promote(panel2Ref.current);
    setPanel1(n1);
    setPanel2(n2);

    const userRows: BetRow[] = [];
    const pushUser = (panel: 1 | 2, stake: number) => {
      userRows.push({
        id: `me_${panel}_${roundId}`,
        player: myUserLabel,
        betInr: stake,
        cashoutX: null,
        winInr: 0,
        status: "pending",
        createdAt: Date.now(),
        panel,
        roundId,
        avatar: AVATARS[avatarIdxRef.current % AVATARS.length],
      });
    };
    if (n1.placedRoundId === roundId && n1.lockedStake != null) pushUser(1, n1.lockedStake);
    if (n2.placedRoundId === roundId && n2.lockedStake != null) pushUser(2, n2.lockedStake);
    setBets([...userRows, ...buildRoundBets(roundId)]);

    const submitQueued = async (panelIdx: 1 | 2, p: BetPanelState) => {
      if (simulationActive) return;
      if (p.placedRoundId !== roundId || p.lockedStake == null) return;
      const stake = p.lockedStake;
      const setP = panelIdx === 1 ? setPanel1 : setPanel2;
      try {
        const res = await placeBet({ round_id: roundId, bet_amount: stake.toFixed(2), slot: panelIdx });
        setWallet(res.profile.fake_wallet_balance);
        setLocalAdjust((a) => Math.round((a + stake) * 100) / 100);
      } catch (e) {
        setLocalAdjust((a) => Math.round((a + stake) * 100) / 100);
        setP((cur) => ({
          ...cur,
          placedRoundId: null,
          lockedStake: null,
          lastActionError: e instanceof Error ? e.message : "Bet failed",
        }));
        setBets((prev) => prev.filter((r) => !(r.panel === panelIdx && r.roundId === roundId)));
      }
    };
    void submitQueued(1, n1);
    void submitQueued(2, n2);
  }, [myUserLabel, roundId, simulationActive]);

  const rememberBet = useCallback((row: MyBetRecord) => {
    setMyBets((h) => {
      const next = [row, ...h].slice(0, 80);
      saveMyBets(next);
      return next;
    });
  }, []);

  const doPlaceBet = useCallback(async (panelIdx: 1 | 2) => {
    if (!roundId) return;
    const state = panelIdx === 1 ? panel1 : panel2;
    const setP = panelIdx === 1 ? setPanel1 : setPanel2;
    if (state.placing || state.cashing || state.queuedForNext) return;
    const activeFlight = status === "flying" && state.placedRoundId === roundId && state.cashedRoundId !== roundId;
    if (activeFlight) return;
    if (status === "waiting" && state.placedRoundId === roundId) return;

    const amountN = parsePositiveNumber(state.amount);
    if (!Number.isFinite(amountN) || amountN < 1) {
      setP((p) => ({ ...p, lastActionError: "Invalid bet amount" }));
      return;
    }

    const available = parsePositiveNumber(wallet ?? "0") + localAdjust;
    if (!Number.isFinite(available) || available + 1e-9 < amountN) {
      setP((p) => ({ ...p, lastActionError: "Insufficient balance" }));
      return;
    }

    const queueOnly = status !== "waiting";
    setP((p) => ({ ...p, placing: true, lastActionError: null }));

    if (queueOnly) {
      if (simulationActive) {
        setWallet((w) => {
          const bal = parsePositiveNumber(w ?? "0");
          return (Math.round((bal - amountN) * 100) / 100).toFixed(2);
        });
      } else {
        setLocalAdjust((a) => Math.round((a - amountN) * 100) / 100);
      }
      setP((p) => ({ ...p, placing: false, queuedForNext: true, lockedStake: amountN }));
      return;
    }

    if (simulationActive) {
      const dedupeKey = `${roundId}_${panelIdx}`;
      if (simBetKeysRef.current.has(dedupeKey)) {
        setP((p) => ({ ...p, placing: false, lastActionError: "Already placed for this round" }));
        return;
      }
      simBetKeysRef.current.add(dedupeKey);
      setWallet((w) => {
        const bal = parsePositiveNumber(w ?? "0");
        return (Math.round((bal - amountN) * 100) / 100).toFixed(2);
      });
      setP((p) => ({ ...p, placing: false, placedRoundId: roundId, lockedStake: amountN, cashedRoundId: null }));
      setBets((prev) => [
        {
          id: `me_${panelIdx}_${roundId}`,
          player: myUserLabel,
          betInr: amountN,
          cashoutX: null,
          winInr: 0,
          status: "pending",
          createdAt: Date.now(),
          panel: panelIdx,
          roundId,
          avatar: AVATARS[avatarIdxRef.current % AVATARS.length],
        },
        ...prev.filter((r) => !(r.panel === panelIdx && r.roundId === roundId)),
      ]);
      return;
    }

    try {
      const res = await placeBet({ round_id: roundId, bet_amount: amountN.toFixed(2), slot: panelIdx });
      setWallet(res.profile.fake_wallet_balance);
      setP((p) => ({ ...p, placing: false, placedRoundId: roundId, lockedStake: amountN, cashedRoundId: null }));
      setBets((prev) => [
        {
          id: `me_${panelIdx}_${roundId}`,
          player: myUserLabel,
          betInr: amountN,
          cashoutX: null,
          winInr: 0,
          status: "pending",
          createdAt: Date.now(),
          panel: panelIdx,
          roundId,
          avatar: AVATARS[avatarIdxRef.current % AVATARS.length],
        },
        ...prev.filter((r) => !(r.panel === panelIdx && r.roundId === roundId)),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bet failed";
      setP((p) => ({ ...p, placing: false, lastActionError: msg }));
    }
  }, [localAdjust, myUserLabel, panel1, panel2, roundId, simulationActive, status, wallet]);

  const doCancel = useCallback(async (panelIdx: 1 | 2) => {
    const state = panelIdx === 1 ? panel1 : panel2;
    const setP = panelIdx === 1 ? setPanel1 : setPanel2;
    const stake = state.lockedStake ?? 0;

    if (state.queuedForNext) {
      if (stake > 0) {
        if (simulationActive) {
          setWallet((w) => {
            const bal = parsePositiveNumber(w ?? "0");
            return (Math.round((bal + stake) * 100) / 100).toFixed(2);
          });
        } else {
          setLocalAdjust((a) => Math.round((a + stake) * 100) / 100);
        }
      }
      setP((p) => ({ ...p, queuedForNext: false, lockedStake: null, lastActionError: null }));
      return;
    }

    if (!roundId || status !== "waiting" || state.placedRoundId !== roundId) return;

    if (simulationActive) {
      simBetKeysRef.current.delete(`${roundId}_${panelIdx}`);
      if (stake > 0) {
        setWallet((w) => {
          const bal = parsePositiveNumber(w ?? "0");
          return (Math.round((bal + stake) * 100) / 100).toFixed(2);
        });
      }
      setP((p) => ({ ...p, placedRoundId: null, lockedStake: null, lastActionError: null }));
      setBets((prev) => prev.filter((r) => !(r.panel === panelIdx && r.roundId === roundId)));
      return;
    }

    setP((p) => ({ ...p, placing: true, lastActionError: null }));
    try {
      const res = await cancelBet({ round_id: roundId, slot: panelIdx });
      setWallet(res.profile.fake_wallet_balance);
      setP((p) => ({ ...p, placing: false, placedRoundId: null, lockedStake: null }));
      setBets((prev) => prev.filter((r) => !(r.panel === panelIdx && r.roundId === roundId)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cancel failed";
      setP((p) => ({ ...p, placing: false, lastActionError: msg }));
    }
  }, [panel1, panel2, roundId, simulationActive, status]);

  const doCashout = useCallback(async (panelIdx: 1 | 2) => {
    if (!roundId || status !== "flying") return;
    const state = panelIdx === 1 ? panel1 : panel2;
    const setP = panelIdx === 1 ? setPanel1 : setPanel2;
    if (state.cashing || state.cashedRoundId === roundId) return;
    if (state.placedRoundId !== roundId) {
      setP((p) => ({ ...p, lastActionError: "Place a bet first" }));
      return;
    }

    const x = multiplierRef.current;
    const stake = state.lockedStake ?? parsePositiveNumber(state.amount);
    const lockedX = Math.round(x * 100) / 100;
    const payout = Math.round((Number.isFinite(stake) ? stake : 0) * lockedX * 100) / 100;

    setP((p) => ({ ...p, cashing: true, cashedRoundId: roundId, lastActionError: null }));
    setBets((prev) => {
      const idx = prev.findIndex((r) => r.panel === panelIdx && r.roundId === roundId && r.status === "pending");
      if (idx < 0) return prev;
      const copy = prev.slice();
      copy[idx] = { ...copy[idx]!, status: "won", cashoutX: lockedX, winInr: payout };
      return copy;
    });
    setWinOverlay({ show: true, amount: payout, multiplier: lockedX });
    rememberBet({
      id: `win_${panelIdx}_${roundId}_${Date.now()}`,
      roundId,
      panel: panelIdx,
      stake: Number.isFinite(stake) ? stake : 0,
      cashoutX: lockedX,
      winInr: payout,
      status: "won",
      at: Date.now(),
    });
    if (soundEnabledRef.current) playTone(660, 0.08);

    if (simulationActive) {
      const dedupeKey = `${roundId}_${panelIdx}`;
      if (!simCashoutKeysRef.current.has(dedupeKey)) {
        simCashoutKeysRef.current.add(dedupeKey);
        setWallet((wp) => {
          const bal = parsePositiveNumber(wp ?? "0");
          return (Math.round((bal + payout) * 100) / 100).toFixed(2);
        });
      }
      setP((p) => ({ ...p, cashing: false }));
      return;
    }

    try {
      const res = await cashout({ round_id: roundId, slot: panelIdx });
      setWallet(res.profile.fake_wallet_balance);
      const serverX = Number(res.bet.cashout_multiplier ?? lockedX);
      const serverWin = Number(res.bet.payout_amount ?? payout);
      setWinOverlay({ show: true, amount: serverWin, multiplier: serverX });
      setBets((prev) => {
        const idx = prev.findIndex((r) => r.panel === panelIdx && r.roundId === roundId);
        if (idx < 0) return prev;
        const copy = prev.slice();
        copy[idx] = {
          ...copy[idx]!,
          status: "won",
          cashoutX: Math.round(serverX * 100) / 100,
          winInr: Math.round(serverWin * 100) / 100,
        };
        return copy;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cashout failed";
      setP((p) => ({ ...p, cashedRoundId: null, lastActionError: msg }));
      setBets((prev) => {
        const idx = prev.findIndex((r) => r.panel === panelIdx && r.roundId === roundId);
        if (idx < 0) return prev;
        const copy = prev.slice();
        copy[idx] = { ...copy[idx]!, status: "pending", cashoutX: null, winInr: 0 };
        return copy;
      });
    } finally {
      setP((p) => ({ ...p, cashing: false }));
    }
  }, [panel1, panel2, rememberBet, roundId, simulationActive, status]);

  const maybeAutoBet = useCallback(
    async (panelIdx: 1 | 2) => {
      const p = panelIdx === 1 ? panel1 : panel2;
      if (p.mode !== "auto" || !p.autoBetEnabled) return;
      if (!roundId) return;
      if (p.placedRoundId === roundId || p.queuedForNext) return;
      await doPlaceBet(panelIdx);
    },
    [doPlaceBet, panel1, panel2, roundId]
  );

  const maybeAutoCashout = useCallback(
    async (panelIdx: 1 | 2, currentX: number) => {
      const p = panelIdx === 1 ? panel1 : panel2;
      if (p.mode !== "auto" || !p.autoCashoutEnabled) return;
      if (!roundId) return;
      if (p.cashedRoundId === roundId) return;
      if (p.placedRoundId !== roundId) return;
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
    setBets((prev) => settleBotsAtMultiplier(prev, payload.round_id, payload.current_multiplier));
  }, [maybeAutoCashout, payload, roundId]);

  const visibleHistoryPills = useMemo(() => history.slice(0, 16), [history]);
  const waitingSeconds = 6.0;
  const waitingPct = useMemo(() => {
    if (waitingLeft == null) return 0;
    return clamp(((waitingSeconds - waitingLeft) / waitingSeconds) * 100, 0, 100);
  }, [waitingLeft]);

  const roundBook = useMemo(() => (roundId == null ? bets : bets.filter((b) => b.roundId === roundId)), [bets, roundId]);
  const cashedRows = useMemo(() => roundBook.filter((b) => b.status === "won"), [roundBook]);

  const filteredBets = useMemo(() => {
    if (betsTab === "previous") return previousRound?.rows ?? [];
    if (betsTab === "top") {
      return [...cashedRows].sort((a, b) => b.winInr - a.winInr);
    }
    return roundBook;
  }, [betsTab, cashedRows, previousRound, roundBook]);

  const shownWallet = useMemo(() => {
    const n = parsePositiveNumber(wallet ?? "");
    if (!Number.isFinite(n)) return wallet;
    return (Math.round((n + localAdjust) * 100) / 100).toFixed(2);
  }, [localAdjust, wallet]);

  const livePlayersLabel = useMemo(() => crowdTotal(roundId).toLocaleString("en-IN"), [roundId]);
  const liveCrowd = useMemo(
    () => crowdCashed(roundId, status === "flying" || status === "crashed" ? multiplier : 1),
    [multiplier, roundId, status],
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

  const setSoundFlag = useCallback((v: boolean) => {
    setSoundEnabled(v);
    try {
      localStorage.setItem(LS_SOUND, v ? "1" : "0");
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
      <audio ref={crashAudioRef} src={PLANE_CRASH_SRC} preload="auto" />

      <div className="mx-auto h-full w-full max-w-[430px] min-w-0">
        <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#050506] sm:rounded-[28px] sm:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.55)] sm:ring-1 sm:ring-white/10">
          {booting ? <SpribeSplash /> : null}
          <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#050506]/96 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-[72px] shrink-0 text-[17px] font-extrabold italic tracking-tight text-[#e93d52]">Aviator</div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex max-w-[148px] items-center gap-1.5 rounded-full bg-[#16171c] px-2.5 py-1.5 ring-1 ring-white/10">
                  <span className={["h-2 w-2 shrink-0 rounded-full", connected ? "bg-emerald-400" : "bg-zinc-600"].join(" ")} />
                  <span className="truncate text-[13px] font-bold tracking-tight text-[#39ef65] tabular-nums">
                    {shownWallet != null ? `${shownWallet} INR` : "Loading..."}
                  </span>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#16171c] text-white/80 ring-1 ring-white/10 active:opacity-95"
                  aria-label="Menu"
                  onClick={() => {
                    setMenuPage("root");
                    setMenuOpen(true);
                  }}
                >
                  <MenuLinesIcon />
                </button>
              </div>
            </div>

            <div className="px-3 pb-1.5">
              <div className="flex items-center gap-1 overflow-hidden">
                <div className="no-scrollbar flex h-7 min-w-0 flex-1 items-center overflow-x-auto rounded-full bg-[#141518] px-1">
                  {visibleHistoryPills.map((x, i) => {
                    const hot = x < 2 ? "text-[#6ec1ff]" : x < 10 ? "text-[#c9a6ff]" : "text-[#ff5d7a]";
                    return (
                      <span
                        key={`${i}_${x}`}
                        className={["shrink-0 px-1.5 text-[13px] font-bold leading-none tabular-nums", hot].join(" ")}
                      >
                        {formatX(x)}
                      </span>
                    );
                  })}
                  {visibleHistoryPills.length === 0 ? (
                    <span className="px-2 text-[12px] font-semibold text-white/35">Waiting for results</span>
                  ) : null}
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

                  <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
                    <div className="text-center">
                      {crashed ? (
                        <div className="mb-1 text-[15px] font-black tracking-tight text-white/90">FLEW AWAY!</div>
                      ) : null}
                      <div
                        id="aviator-live-multiplier"
                        className={[
                          "relative text-[52px] font-black leading-none tracking-tight sm:text-[60px]",
                          "drop-shadow-[0_2px_0_rgba(0,0,0,0.9)] drop-shadow-[0_4px_28px_rgba(0,0,0,0.75)]",
                          crashed ? "text-[#ff3b5c]" : "text-white",
                        ].join(" ")}
                      >
                        {formatX(waiting ? 1 : multiplier)}
                      </div>
                      {waiting && waitingLeft != null ? (
                        <div className="mt-2 text-[15px] font-black tabular-nums text-white/90">
                          Next round in {waitingLeft.toFixed(1)}s
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {animationEnabled ? (
                    <div className="pointer-events-none absolute right-2 bottom-2 z-[3] flex items-center rounded-full bg-black/50 px-1.5 py-1 ring-1 ring-white/10 backdrop-blur-[2px]">
                      <div className="flex -space-x-1.5 pr-1.5">
                        {AVATARS.slice(0, 4).map((src) => (
                          <span
                            key={src}
                            className="h-4 w-4 rounded-full bg-cover bg-center ring-1 ring-black/55"
                            style={{ backgroundImage: `url("${src}")` }}
                          />
                        ))}
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

                  {waiting && roundId != null && ((panel1.placedRoundId === roundId && !panel1.cashedRoundId) || (panel2.placedRoundId === roundId && !panel2.cashedRoundId)) ? (
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
                canBet={!!roundId}
                canCashout={status === "flying" && !!roundId}
                liveMultiplier={multiplier}
                onBet={() => void doPlaceBet(1)}
                onCashout={() => void doCashout(1)}
                onCancel={() => void doCancel(1)}
                toggleAction={!showPanel2 ? { label: "+", onClick: () => setShowPanel2(true) } : undefined}
                roundId={roundId}
                status={status}
              />
              {showPanel2 && (
                <BetPanel
                  state={panel2}
                  setState={setPanel2}
                  canBet={!!roundId}
                  canCashout={status === "flying" && !!roundId}
                  liveMultiplier={multiplier}
                  onBet={() => void doPlaceBet(2)}
                  onCashout={() => void doCashout(2)}
                  onCancel={() => void doCancel(2)}
                  toggleAction={{ label: "−", onClick: () => setShowPanel2(false) }}
                  roundId={roundId}
                  status={status}
                />
              )}
            </div>

            <div className="mt-3 px-3">
              <div className="rounded-[22px] bg-[#12121a] ring-1 ring-white/10">
                <div className="flex items-start gap-2 px-3 pt-3">
                  <div className="flex shrink-0 items-center gap-1.5">
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

                  <div className="min-w-0 flex-1 pt-0.5 text-right text-[11px] leading-tight">
                    {betsTab === "previous" && previousRound ? (
                      <>
                        <div className="font-black text-[#ff5d7a]">Crashed at {formatX(previousRound.crashPoint)}</div>
                        <div className="mt-0.5 font-semibold text-white/75">
                          {previousRound.cashedCount.toLocaleString("en-IN")} out of {previousRound.totalPlayers.toLocaleString("en-IN")} players cashed out
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-white/90">
                          {liveCrowd.cashed.toLocaleString("en-IN")} out of {liveCrowd.total.toLocaleString("en-IN")} players cashed out
                        </div>
                        <div className="mt-0.5 font-semibold tabular-nums text-[#39ef65]">
                          {fmtINR(liveCrowd.amount)} INR
                        </div>
                      </>
                    )}
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

                <div className="no-scrollbar max-h-[420px] overflow-y-auto pb-2 pt-2">
                  {betsTab === "previous" && !previousRound ? (
                    <div className="px-4 py-6 text-center text-xs font-semibold text-white/45">No completed round yet</div>
                  ) : null}
                  {filteredBets.slice(0, 80).map((r) => {
                    const highlight = r.status === "won";
                    return (
                      <div key={r.id} className="px-3">
                        <div className={["grid grid-cols-[1.2fr_0.9fr_0.6fr_0.9fr] items-center gap-2 rounded-2xl px-3 py-2.5 text-sm ring-1", highlight ? "bg-emerald-500/12 ring-emerald-500/20" : "bg-white/5 ring-white/10"].join(" ")}>
                          <div className="flex min-w-0 items-center gap-2">
                            <PlayerFace src={r.avatar} />
                            <span className="truncate text-xs font-semibold text-white/80">{r.player}</span>
                          </div>
                          <div className="text-right text-xs font-semibold tabular-nums text-white/80">{fmtINR(r.betInr)}</div>
                          <div className={["text-right text-xs font-semibold tabular-nums", r.cashoutX ? "text-[#7ec8ff]" : "text-white/35"].join(" ")}>{r.cashoutX ? formatX(r.cashoutX) : "—"}</div>
                          <div className={["text-right text-xs font-semibold tabular-nums", r.winInr ? "text-[#39ef65]" : "text-white/45"].join(" ")}>{r.winInr ? fmtINR(r.winInr) : "0.00"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {menuOpen && menuPage === "history" ? (
            <div className="absolute inset-0 z-[46] flex items-start justify-center bg-black/55 px-3 pt-10">
              <div className="flex max-h-[82%] w-full flex-col rounded-[18px] bg-[#1b1c22] p-4 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold tracking-wide text-white/90">MY BET HISTORY</div>
                  <button type="button" aria-label="Close" onClick={() => setMenuPage("root")} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <CloseIcon />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-[1.1fr_0.9fr_0.6fr_1fr] gap-2 px-1 text-[11px] font-medium text-white/45">
                  <div>Date</div>
                  <div className="text-right">Bet INR</div>
                  <div className="text-right">X</div>
                  <div className="text-right">Cash out INR</div>
                </div>
                <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                  {myBets.length === 0 ? <p className="px-1 py-6 text-center text-sm text-white/45">No bets yet. Place a bet and it will show up here.</p> : null}
                  {myBets.slice(0, historyLimit).map((b) => {
                    const stamp = formatBetStamp(b.at);
                    const hot = (b.cashoutX ?? 0) < 2 ? "text-sky-300" : (b.cashoutX ?? 0) < 10 ? "text-violet-300" : "text-rose-300";
                    return (
                      <div key={b.id} className={["grid grid-cols-[1.1fr_0.9fr_0.6fr_1fr] items-center gap-2 rounded-lg px-2 py-2 text-[12px]", b.status === "won" ? "bg-[#1f6b32]" : "bg-white/[0.03]"].join(" ")}>
                        <div className="leading-tight text-white/80">
                          <div>{stamp.time}</div>
                          <div className="text-[10px] text-white/55">{stamp.date}</div>
                        </div>
                        <div className="text-right font-medium tabular-nums text-white">{fmtINR(b.stake)}</div>
                        <div className={["text-right font-semibold tabular-nums", b.cashoutX ? hot : "text-white/30"].join(" ")}>{b.cashoutX ? formatX(b.cashoutX) : "—"}</div>
                        <div className="flex items-center justify-end gap-1.5 text-white">
                          <span className="tabular-nums">{b.status === "won" ? fmtINR(b.winInr) : ""}</span>
                          <span className="text-[13px] text-[#39ef65]" aria-hidden>✔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {myBets.length > historyLimit ? (
                  <button type="button" onClick={() => setHistoryLimit((n) => n + 10)} className="mx-auto mt-3 rounded-full bg-white/10 px-6 py-2 text-sm text-white/80">
                    Load more
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {menuOpen && menuPage !== "history" ? (
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
                    {menuPage === "root" ? "Menu" : menuPage === "avatar" ? "Change Avatar" : menuPage === "free" ? "Free Bets" : menuPage === "limits" ? "Game Limits" : menuPage === "howto" ? "How to Play" : "Game Rules"}
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.06] text-lg leading-none text-white/70 ring-1 ring-white/10"
                    onClick={() => (menuPage === "root" ? setMenuOpen(false) : setMenuPage("root"))}
                    aria-label={menuPage === "root" ? "Close menu" : "Back"}
                  >
                    <CloseIcon />
                  </button>
                </div>

                {menuPage === "root" ? (
                  <div className="mt-4 max-h-[70dvh] space-y-1 overflow-y-auto">
                    <MenuRow label="Change Avatar" onClick={() => setMenuPage("avatar")} />
                    <MenuToggle label="Sound" on={soundEnabled} onClick={() => setSoundFlag(!soundEnabled)} />
                    <MenuToggle label="Music" on={musicEnabled} onClick={() => setMusicFlag(!musicEnabled)} />
                    <MenuToggle label="Animation" on={animationEnabled} onClick={() => setAnimationFlag(!animationEnabled)} />
                    <MenuRow label="Free Bets" onClick={() => setMenuPage("free")} />
                    <MenuRow label="My Bet History" onClick={() => setMenuPage("history")} />
                    <MenuRow label="Game Limits" onClick={() => setMenuPage("limits")} />
                    <MenuRow label="How to Play" onClick={() => setMenuPage("howto")} />
                    <MenuRow label="Game Rules" onClick={() => setMenuPage("rules")} />
                  </div>
                ) : null}

                {menuPage === "avatar" ? (
                  <div className="mt-4">
                    <div className="grid grid-cols-4 gap-3">
                      {AVATARS.map((src, i) => (
                        <button
                          key={src}
                          type="button"
                          aria-label={`Avatar ${i + 1}`}
                          onClick={() => {
                            setAvatarIdx(i);
                            try {
                              localStorage.setItem(LS_AVATAR, String(i));
                            } catch {
                              /* ignore */
                            }
                          }}
                          className={[
                            "mx-auto h-12 w-12 rounded-full bg-cover bg-center ring-2",
                            avatarIdx === i ? "ring-white" : "ring-transparent",
                          ].join(" ")}
                          style={{ backgroundImage: `url("${src}")` }}
                        />
                      ))}
                    </div>
                    <label className="mt-4 block text-[11px] font-semibold text-white/45" htmlFor="aviator-display-name">
                      Name
                    </label>
                    <input
                      id="aviator-display-name"
                      type="text"
                      autoComplete="nickname"
                      className="mt-1.5 w-full rounded-[14px] border border-white/[0.08] bg-black/35 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#28a909]/55"
                      value={displayName}
                      placeholder="Enter a name"
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={handleNameBlur}
                    />
                  </div>
                ) : null}

                {menuPage === "free" ? (
                  <div className="mt-6 rounded-2xl bg-white/5 px-4 py-6 text-center">
                    <div className="text-sm font-semibold text-white/80">No free bets</div>
                    <p className="mt-1 text-xs leading-5 text-white/45">Free bets show up here when they are credited to this account.</p>
                  </div>
                ) : null}

                {menuPage === "howto" ? (
                  <div className="mt-4 space-y-4 rounded-2xl bg-[#f0a024] px-4 py-5 text-[#1a1a1a]">
                    {[
                      ["01", "Make a bet, or even two at same time and wait for the round to start."],
                      ["02", "Look after the lucky plane. Your win is bet multiplied by a coefficient of lucky plane."],
                      ["03", "Cash Out before plane flies away and money is yours!"],
                    ].map(([n, text]) => (
                      <div key={n} className="grid grid-cols-[36px_1fr] gap-2">
                        <div className="text-[20px] font-light leading-none">{n}</div>
                        <p className="text-[14px] font-medium leading-6">{text}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {menuPage === "limits" ? (
                  <div className="mt-4 space-y-3 text-[14px] text-white/90">
                    <div className="flex items-center justify-between gap-3">
                      <span>Minimum bet INR:</span>
                      <span className="rounded-full bg-[#28a909] px-3 py-1 text-[13px] font-semibold tabular-nums text-white">10.00</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Maximum bet INR:</span>
                      <span className="rounded-full bg-[#28a909] px-3 py-1 text-[13px] font-semibold tabular-nums text-white">8,000.00</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Maximum win for one bet INR:</span>
                      <span className="rounded-full bg-[#28a909] px-3 py-1 text-[13px] font-semibold tabular-nums text-white">800,000.00</span>
                    </div>
                  </div>
                ) : null}

                {menuPage === "rules" ? (
                  <div className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                    <p>If you cash out before the crash, you win stake × multiplier. If you do not cash out, the stake is lost.</p>
                    <p>Bets are only accepted during the betting window. Each panel has its own stake and cash out.</p>
                  </div>
                ) : null}
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
  const flyAwayRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  phaseRef.current = phase;
  multRef.current = multiplier;

  useEffect(() => {
    if (phase !== "waiting") return;
    animMultRef.current = 1;
    flyAwayRef.current = null;
    const el = document.getElementById("aviator-live-multiplier");
    if (el) el.textContent = "1.00x";
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
        if (animMultRef.current > targetMult + 0.2 && targetMult < 1.25) {
          animMultRef.current = 1;
        }
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
        flyAwayRef.current = null;
      } else if (curPhase === "crashed") {
        const crashM = multRef.current > 1 ? multRef.current : animMultRef.current;
        animMultRef.current = crashM;
      } else {
        animMultRef.current = 1;
        flyAwayRef.current = null;
      }

      const m = animMultRef.current;
      const isFlying = curPhase === "flying";
      const isCrashed = curPhase === "crashed";

      // Directly update the big text multiplier element in the DOM at 60fps
      const liveTextEl = document.getElementById("aviator-live-multiplier");
      if (liveTextEl) {
        if (curPhase === "waiting") {
          liveTextEl.textContent = "1.00x";
        } else if (isFlying) {
          liveTextEl.textContent = `${m.toFixed(2)}x`;
        } else if (curPhase === "crashed") {
          liveTextEl.textContent = `${multRef.current.toFixed(2)}x`;
        }
      }

      if (m <= 1.002 || (!isFlying && !isCrashed)) {
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

      if (isFlying) {
        strokeRef.current?.setAttribute("d", curveD);
        const fillD = `${curveD} L${tip.x.toFixed(1)} ${baseY} L${pts[0].x.toFixed(1)} ${baseY} Z`;
        fillRef.current?.setAttribute("d", fillD);
      } else {
        strokeRef.current?.setAttribute("d", "");
        fillRef.current?.setAttribute("d", "");
      }

      if (!isFlying && !flyAwayRef.current) {
        const prevPt = pts[Math.max(0, pts.length - 2)] ?? tip;
        let dx = tip.x - prevPt.x;
        let dy = tip.y - prevPt.y;
        if (dx < 6) dx = 16;
        if (dy > -4) dy = -12;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 280;
        flyAwayRef.current = { x: tip.x, y: tip.y, vx: (dx / len) * speed, vy: (dy / len) * speed };
      }

      let planeX = tip.x;
      let planeY = tip.y;
      if (!isFlying && flyAwayRef.current) {
        const fly = flyAwayRef.current;
        fly.x += fly.vx * dt;
        fly.y += fly.vy * dt;
        planeX = fly.x;
        planeY = fly.y;
      }
      const offScreen = planeX > ARENA_VB_W + 90 || planeY < -90 || planeX < -90;
      planeRef.current?.setAttribute("opacity", offScreen ? "0" : "1");

      /* ── Plane position & angle ── */
      // User explicitly requested NO curve rotation ("plan ko jesa he same vesa rakho")
      // We rely entirely on the PNG's built-in tilt for the angle.
      const planeAngle = 0;

      planeRef.current?.setAttribute(
        "transform",
        `translate(${planeX.toFixed(1)} ${planeY.toFixed(1)}) rotate(${planeAngle})`
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

function MenuRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-xl px-2 py-3 text-left text-[14px] font-bold text-white/90 active:bg-white/5">
      <span>{label}</span>
      <span className="text-white/35">›</span>
    </button>
  );
}

function MenuToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      <div className="text-[14px] font-bold text-white/90">{label}</div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onClick}
        className={[
          "inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] ring-1 ring-white/10 transition-colors",
          on ? "justify-end bg-[#28a909]" : "justify-start bg-white/[0.16]",
        ].join(" ")}
      >
        <span className="h-6 w-6 rounded-full bg-white shadow" />
      </button>
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

function SpribeSplash() {
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black">
      <div className="text-[11px] tracking-[0.28em] text-white/55">POWERED BY</div>
      <div className="mt-3 flex items-center gap-3">
        <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden>
          <circle cx="21" cy="21" r="16" fill="none" stroke="white" strokeWidth="3" strokeDasharray="2 3" />
          <circle cx="21" cy="21" r="6" fill="white" />
        </svg>
        <div>
          <div className="text-[28px] font-black tracking-wide text-white">SPRIBE</div>
          <div className="text-[8px] tracking-[0.22em] text-white/70">INSIGHTFUL ENTERTAINMENT</div>
        </div>
      </div>
      <div className="mt-8 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff2d2d]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff2d2d]/80 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff2d2d]/60 [animation-delay:300ms]" />
      </div>
    </div>
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
  liveMultiplier,
  onBet,
  onCashout,
  onCancel,
  toggleAction,
  roundId,
  status,
}: {
  state: BetPanelState;
  setState: React.Dispatch<React.SetStateAction<BetPanelState>>;
  canBet: boolean;
  canCashout: boolean;
  liveMultiplier: number;
  onBet: () => void;
  onCashout: () => void;
  onCancel: () => void;
  toggleAction?: { label: string; onClick: () => void };
  roundId: number | null;
  status: string;
}) {
  const disabled = state.placing || state.cashing;
  const amountN = parsePositiveNumber(state.amount);
  const amountLabel = Number.isFinite(amountN) ? fmtINR(amountN) : state.amount;
  const autoEnabled = state.mode === "auto";
  const stake = state.lockedStake ?? (Number.isFinite(amountN) ? amountN : 0);
  const liveWin = Math.round(stake * (liveMultiplier || 1) * 100) / 100;

  const placed = roundId != null && state.placedRoundId === roundId;
  const cashed = placed && state.cashedRoundId === roundId;
  const waitingBet = placed && status === "waiting";
  const flyingBet = placed && status === "flying" && !cashed;

  let btnBg = "bg-[#28a909] ring-[#b8f56a]/30";
  let primary = roundId == null ? "Connecting..." : "Bet";
  let secondary = Number.isFinite(amountN) ? `${fmtINR(amountN)} INR` : "";
  let btnAction: (() => void) | undefined = canBet ? onBet : undefined;

  if (cashed) {
    btnBg = "bg-[#1f4d28] ring-emerald-700/40";
    primary = "Cashed Out";
    secondary = "";
    btnAction = undefined;
  } else if (state.queuedForNext || waitingBet) {
    btnBg = "bg-[#e67e12] ring-[#ffb15a]/40";
    primary = "Cancel";
    secondary = "Waiting for next round";
    btnAction = onCancel;
  } else if (flyingBet) {
    btnBg = "bg-[#e6a117] ring-[#ffe08a]/35";
    primary = "Cash Out";
    secondary = fmtINR(liveWin);
    btnAction = canCashout ? onCashout : undefined;
  }

  return (
    <div className="overflow-hidden rounded-[16px] bg-[#1a1b1d] p-2 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-full bg-black/35 ring-1 ring-white/10">
          <button type="button" onClick={() => setState((p) => ({ ...p, mode: "bet" }))} className={["h-8 px-4 text-[13px] font-medium", state.mode === "bet" ? "bg-white/10 text-white" : "text-white/65"].join(" ")}>
            Bet
          </button>
          <button type="button" onClick={() => setState((p) => ({ ...p, mode: "auto" }))} className={["h-8 px-4 text-[13px] font-medium", state.mode === "auto" ? "bg-white/10 text-white" : "text-white/65"].join(" ")}>
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
            "relative h-[86px] rounded-[12px] px-3 py-2 text-left ring-1 active:scale-[0.99]",
            btnBg,
          ].join(" ")}
          onClick={() => {
            if (btnAction) btnAction();
          }}
          disabled={disabled || !btnAction}
        >
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-[22px] font-normal leading-tight text-white">{primary}</div>
            {secondary ? (
              <div className={["mt-1 font-normal leading-tight text-white", primary === "Cash Out" ? "text-[24px] tabular-nums" : "text-[16px]"].join(" ")}>
                {secondary}
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

