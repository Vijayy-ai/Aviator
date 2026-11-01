const PRODUCTION_WS = "wss://aviator-fcon.onrender.com/ws/game/";
const PRODUCTION_PREVIEW_WS = "wss://aviator-fcon.onrender.com/ws/game-preview/";

function isPrivateLanHost(host: string) {
  return (
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host) ||
    host.endsWith(".local")
  );
}

function rewriteLocalWs(env: string, host: string, path: "/ws/game/" | "/ws/game-preview/") {
  const isEnvLocalhost = /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(env);
  if (!isEnvLocalhost) return env;
  if (host === "localhost" || host === "127.0.0.1") return env;
  if (isPrivateLanHost(host)) {
    const portMatch = env.match(/:(\d+)\//);
    const port = portMatch?.[1] ?? "8000";
    return `ws://${host}:${port}${path}`;
  }
  // Public hosts (vercel.app etc.) must use production WSS — never :8000
  return path === "/ws/game/" ? PRODUCTION_WS : PRODUCTION_PREVIEW_WS;
}

function resolvedWsUrl() {
  const env = process.env.NEXT_PUBLIC_WS_URL?.trim() || PRODUCTION_WS;
  if (typeof window !== "undefined") {
    return rewriteLocalWs(env, window.location.hostname, "/ws/game/");
  }
  return env;
}

function resolvedPreviewWsUrl() {
  const env =
    process.env.NEXT_PUBLIC_PREVIEW_WS_URL?.trim() ||
    process.env.NEXT_PUBLIC_WS_URL?.trim()?.replace(/\/ws\/game\/?$/i, "/ws/game-preview/") ||
    PRODUCTION_PREVIEW_WS;
  if (typeof window !== "undefined") {
    return rewriteLocalWs(env, window.location.hostname, "/ws/game-preview/");
  }
  return env;
}

/** Resolved at module load on client; same-origin LAN rewrite applies in browser. */
export const WS_URL = resolvedWsUrl();
export const PREVIEW_WS_URL = resolvedPreviewWsUrl();
