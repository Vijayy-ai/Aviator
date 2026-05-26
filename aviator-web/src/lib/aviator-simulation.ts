import { crashForRound } from "@/data/crash-sequence";

export type WaitingPayload = { status: "waiting"; time_left: number; round_id: number; round_number: number };
export type FlyingPayload = { status: "flying"; current_multiplier: number; round_id: number; round_number: number };
export type CrashedPayload = { status: "crashed"; crash_point: number; round_id: number; round_number: number };
export type SimGamePayload = WaitingPayload | FlyingPayload | CrashedPayload;

/** Matches `core/game_engine.py`. */
const WAIT_S = 6;
const WAIT_TICK_MS = 200;
const FLY_TICK_MS = 100;
const POST_CRASH_MS = 500;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Multiplier growth — matches real Aviator timing.
 *  1.09x ≈ 3.5s, 1.50x ≈ 9.2s, 2.0x ≈ 12.5s, 5.0x ≈ 20s, 10x ≈ 27s, 20x ≈ 31s */
function multiplierAtElapsed(elapsed: number) {
  const raw = Math.exp(0.0035 * elapsed * elapsed + 0.012 * elapsed);
  return round2(raw);
}

function quantizeLtCrash(current: number, crashPoint: number) {
  return round2(current) < round2(crashPoint);
}

/**
 * Offline round driver — same timing and multiplier curve as Django game engine.
 */
export function startAviatorSimulation(
  onPayload: (p: SimGamePayload) => void,
  options?: { baseRoundId?: number; startRoundNumber?: number }
) {
  const baseRoundId = options?.baseRoundId ?? 9_000_000;
  let roundNumber = Math.max(1, options?.startRoundNumber ?? 1);
  let cancel = false;
  const timeoutIds: number[] = [];
  const addT = (id: number) => {
    timeoutIds.push(id);
  };

  const clearAll = () => {
    timeoutIds.forEach((id) => window.clearTimeout(id));
    timeoutIds.length = 0;
  };

  const runWaiting = (rid: number, rnum: number) => {
    if (cancel) return;
    let timeLeft = WAIT_S;
    const tick = () => {
      if (cancel) return;
      timeLeft = round2(Math.max(0, timeLeft));
      onPayload({ status: "waiting", time_left: timeLeft, round_id: rid, round_number: rnum });
      if (timeLeft <= 0) {
        runFlying(rid, rnum);
        return;
      }
      timeLeft -= WAIT_TICK_MS / 1000;
      addT(window.setTimeout(tick, WAIT_TICK_MS));
    };
    tick();
  };

  const runFlying = (rid: number, rnum: number) => {
    if (cancel) return;
    const crashPoint = crashForRound(rnum);
    const start = performance.now();

    const tick = () => {
      if (cancel) return;
      const elapsed = (performance.now() - start) / 1000;
      let mult = multiplierAtElapsed(elapsed);
      mult = Math.min(mult, crashPoint);

      if (!quantizeLtCrash(mult, crashPoint)) {
        onPayload({
          status: "crashed",
          crash_point: round2(crashPoint),
          round_id: rid,
          round_number: rnum,
        });
        addT(
          window.setTimeout(() => {
            roundNumber += 1;
            const nextRid = baseRoundId + roundNumber;
            runWaiting(nextRid, roundNumber);
          }, POST_CRASH_MS)
        );
        return;
      }

      onPayload({
        status: "flying",
        current_multiplier: mult,
        round_id: rid,
        round_number: rnum,
      });
      addT(window.setTimeout(tick, FLY_TICK_MS));
    };
    tick();
  };

  const rid = baseRoundId + roundNumber;
  runWaiting(rid, roundNumber);

  return () => {
    cancel = true;
    clearAll();
  };
}
