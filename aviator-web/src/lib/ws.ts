function resolvedWsUrl() {
  const env = process.env.NEXT_PUBLIC_WS_URL?.trim() || "wss://aviator-fcon.onrender.com/ws/game/";
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isEnvLocalhost = /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(env);
    const isLanHost = host && host !== "localhost" && host !== "127.0.0.1";
    if (isLanHost && isEnvLocalhost) {
      const portMatch = env.match(/:(\d+)\//);
      const port = portMatch?.[1] ?? "8000";
      return `ws://${host}:${port}/ws/game/`;
    }
  }
  return env;
}

function resolvedPreviewWsUrl() {
  const env =
    process.env.NEXT_PUBLIC_PREVIEW_WS_URL?.trim() ||
    process.env.NEXT_PUBLIC_WS_URL?.trim()?.replace(/\/ws\/game\/?$/i, "/ws/game-preview/") ||
    "wss://aviator-fcon.onrender.com/ws/game-preview/";
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isEnvLocalhost = /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(env);
    const isLanHost = host && host !== "localhost" && host !== "127.0.0.1";
    if (isLanHost && isEnvLocalhost) {
      const portMatch = env.match(/:(\d+)\//);
      const port = portMatch?.[1] ?? "8000";
      return `ws://${host}:${port}/ws/game-preview/`;
    }
  }
  return env;
}

/** Resolved at module load on client; same-origin LAN rewrite applies in browser. */
export const WS_URL = resolvedWsUrl();
export const PREVIEW_WS_URL = resolvedPreviewWsUrl();

