/**
 * Deterministic 100-round crash multipliers — matches backend `build_predefined_crash_points(100, seed=5065)`.
 * Pattern: 5–7 small → big → (sometimes tiny) → 6–8 small → big → repeat.
 */
export const AVIATOR_CRASH_SEQUENCE: readonly number[] = [
  1.09, 1.53, 1.93, 1.44, 1.57, 1.89, 20.98, 1.06, 2.54, 1.29, 1.96, 1.17, 1.75, 3.09, 3.25, 22.35,
  3.08, 4.66, 1.17, 1.82, 1.84, 1.1, 2.77, 17.23, 1.28, 2.51, 1.86, 3.28, 1.44, 3.38, 4.15, 23.76,
  4.37, 1.53, 1.26, 1.51, 1.25, 20.35, 4.66, 1.14, 2.15, 4.07, 4.51, 3.39, 1.09, 24.22, 1.93, 4.51,
  4.78, 1.55, 1.24, 21.22, 3.19, 1.18, 1.64, 1.18, 1.33, 1.59, 1.15, 2.06, 22.55, 1.09, 3.41, 1.63,
  4.26, 1.12, 2.03, 23.47, 1.21, 1.62, 1.28, 1.61, 2.41, 3.97, 1.09, 4.65, 4.01, 24.06, 1.14, 3.7,
  1.98, 4.03, 3.21, 3.16, 2.23, 19.91, 1.22, 2.19, 2.21, 4.26, 4.14, 1.43, 2.43, 4.1, 22.34, 1.12,
  2.59, 4.45, 3.45, 3.92,
] as const;

export function crashForRound(roundNumber: number): number {
  const idx = Math.floor(roundNumber - 1) % AVIATOR_CRASH_SEQUENCE.length;
  const safe =
    ((idx % AVIATOR_CRASH_SEQUENCE.length) + AVIATOR_CRASH_SEQUENCE.length) %
    AVIATOR_CRASH_SEQUENCE.length;
  return AVIATOR_CRASH_SEQUENCE[safe]!;
}
