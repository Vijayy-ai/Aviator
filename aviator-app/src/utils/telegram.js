/** Build a Telegram user/DM link from @username, username, or full URL. */
export function toTelegramUserLink(idOrUrl) {
  const raw = String(idOrUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const username = raw.replace(/^@/, '');
  return `https://t.me/${username}`;
}
