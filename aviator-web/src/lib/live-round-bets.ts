export type LiveBetRow = {
  id: string;
  player: string;
  betInr: number;
  cashoutX: number | null;
  winInr: number;
  status: "pending" | "won" | "lost";
  createdAt: number;
  panel?: 1 | 2;
  /** Bot cash-out target. Absent on the player's own rows. */
  targetX?: number;
  roundId: number;
  avatar?: string;
};

export const PLAYER_FACES = [
  "/faces/face-no1.jpg",
  "/faces/face-no2.jpg",
  "/faces/face-no3.jpg",
  "/faces/face-04.jpg",
  "/faces/face-05.jpg",
  "/faces/face-06.jpg",
  "/faces/face-07.jpg",
  "/faces/face-08.jpg",
  "/faces/face-09.jpg",
  "/faces/face-10.jpg",
];
const AMOUNTS = [10, 12, 20, 48, 50, 75, 100, 150, 200, 300, 400, 500, 800, 1000, 1500, 2000, 3000, 5000, 7000, 8000];

function hash(n: number) {
  let x = (Math.imul(n | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function maskedPlayer(seed: number) {
  const heads = "abcdefghjkmnpqrstuvwyz";
  const tails = "0123456789abcdft";
  return `${heads[seed % heads.length]}***${tails[(seed >>> 5) % tails.length]}`;
}

/** Same number shown on the arena badge and in the cash-out line. */
export function crowdTotal(roundId: number | null | undefined): number {
  if (roundId == null) return 1600;
  return 1100 + (hash(roundId + 17) % 1901);
}

/** Headline cash-out stats for the whole round, scaled to the arena player count. */
export function crowdCashed(roundId: number | null | undefined, multiplier: number) {
  const total = crowdTotal(roundId);
  const t = Math.max(0, (Number.isFinite(multiplier) ? multiplier : 1) - 1);
  const frac = Math.min(0.84, 1 - Math.exp(-t * 1.15));
  const cashed = Math.min(total - 1, Math.floor(total * frac));
  const avgBet = 70 + (hash((roundId ?? 1) + 3) % 160);
  const avgX = 1 + Math.min(t, 2.4) * 0.5;
  const amount = Math.round(cashed * avgBet * avgX * 100) / 100;
  return { total, cashed, amount };
}

/** Fresh pending book for a round. Names, stakes, and cash-out targets change with the round id. */
export function buildRoundBets(roundId: number): LiveBetRow[] {
  const count = 32 + (hash(roundId) % 10);
  const rows: LiveBetRow[] = [];
  for (let i = 0; i < count; i++) {
    const seed = hash(roundId * 131 + i * 17 + 9);
    const betInr = AMOUNTS[seed % AMOUNTS.length]!;
    const bucket = seed % 100;
    let targetX: number;
    if (bucket < 42) targetX = 1.02 + (seed % 16) / 100;
    else if (bucket < 78) targetX = 1.2 + ((seed >>> 3) % 90) / 100;
    else targetX = 2.1 + ((seed >>> 7) % 420) / 100;
    targetX = Math.round(targetX * 100) / 100;
    rows.push({
      id: `bot_${roundId}_${i}_${seed.toString(16)}`,
      player: maskedPlayer(seed + i * 13),
      betInr,
      cashoutX: null,
      winInr: 0,
      status: "pending",
      createdAt: 1_700_000_000_000 - i * 80 - (seed % 500),
      targetX,
      roundId,
      avatar: PLAYER_FACES[seed % PLAYER_FACES.length]!,
    });
  }
  return rows;
}

/** Mark bots cashed out once the live multiplier reaches their target. Returns the same array if nothing changed. */
export function settleBotsAtMultiplier(rows: LiveBetRow[], roundId: number, multiplier: number): LiveBetRow[] {
  let changed = false;
  const next = rows.map((r) => {
    if (r.panel || r.roundId !== roundId || r.status !== "pending" || r.targetX == null) return r;
    if (multiplier + 1e-6 < r.targetX) return r;
    changed = true;
    const x = r.targetX;
    return {
      ...r,
      status: "won" as const,
      cashoutX: x,
      winInr: Math.round(r.betInr * x * 100) / 100,
    };
  });
  return changed ? next : rows;
}
