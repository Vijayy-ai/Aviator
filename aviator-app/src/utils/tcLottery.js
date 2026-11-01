/** Display name for the live-synced game (formerly Aviator). */
export const TC_LOTTERY_TITLE = 'Tc Lottery';

/**
 * Detect the live prediction game by title.
 * Keeps recognizing legacy "Aviator" so existing Firestore docs still work.
 */
export function isTcLotteryGame(title) {
  const t = String(title || '')
    .trim()
    .toLowerCase();
  return t === 'aviator' || t === 'tc lottery';
}
