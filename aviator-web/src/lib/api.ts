function resolvedApiBaseUrl() {
  const env = process.env.NEXT_PUBLIC_DJANGO_API_BASE_URL?.replace(/\/$/, "") || "https://aviator-fcon.onrender.com";
  // If you open the web UI via LAN IP (10.x), "localhost:8000" points to the phone itself and login fails.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isEnvLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(env);
    const isLanHost = host && host !== "localhost" && host !== "127.0.0.1";
    if (isLanHost && isEnvLocalhost) return `http://${host}:8000`;
  }
  return env;
}

export const API_BASE_URL = resolvedApiBaseUrl();

async function authHeaders() {
  const { firebaseAuth } = await import("./firebase");
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not logged in");
  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
  };
}

export async function firebaseLoginToBackend(params: { idToken: string; source: "web" | "app" }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "Login failed";
    throw new Error(detail);
  }
  return data as { profile: { username: string; firebase_uid: string; platform_type: "WEB" | "APP"; fake_wallet_balance: string } };
}

export async function fetchMe() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/auth/me/`, {
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Failed to load profile");
  return data as { profile: { username: string; firebase_uid: string; platform_type: "WEB" | "APP"; fake_wallet_balance: string } };
}

export async function updateUsername(username: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/profile/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Failed to update name");
  return data as { profile: { username: string; firebase_uid: string; platform_type: "WEB" | "APP"; fake_wallet_balance: string } };
}

export async function placeBet(params: { round_id: number; bet_amount: string }) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/game/bet/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Bet failed");
  return data as {
    bet: { id: number; round_id: number; bet_amount: string; status: string; cashout_multiplier: string | null; payout_amount: string };
    profile: { fake_wallet_balance: string; username: string; firebase_uid: string; platform_type: "WEB" | "APP" };
  };
}

export type GameStateResponse = {
  status: "waiting" | "flying" | "crashed";
  round_id: number;
  round_number: number;
  time_left?: number | string;
  current_multiplier?: number | string;
  crash_point?: number | string;
};

export type GamePreviewStateResponse = {
  status: "waiting" | "flying" | "crashed";
  round_id: number;
  round_number: number;
  time_left?: number;
  current_multiplier?: number;
  crash_point?: number;
  current_crash_point: number;
  next_round_number: number;
  next_crash_point: number;
};

export async function fetchGamePreviewState(): Promise<GamePreviewStateResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/game/preview-state/`);
  const data = (await res.json().catch(() => ({}))) as { state?: GamePreviewStateResponse | null };
  if (!res.ok || !data.state) return null;
  const s = data.state;
  return {
    ...s,
    round_id: Number(s.round_id),
    round_number: Number(s.round_number),
    time_left: s.time_left != null ? Number(s.time_left) : undefined,
    current_multiplier: s.current_multiplier != null ? Number(s.current_multiplier) : undefined,
    crash_point: s.crash_point != null ? Number(s.crash_point) : undefined,
    current_crash_point: Number(s.current_crash_point),
    next_round_number: Number(s.next_round_number),
    next_crash_point: Number(s.next_crash_point),
  };
}

export async function fetchGameState(): Promise<GameStateResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/game/state/`);
  const data = (await res.json().catch(() => ({}))) as { state?: GameStateResponse | null };
  if (!res.ok || !data.state) return null;
  const s = data.state;
  if (s.status !== "waiting" && s.status !== "flying" && s.status !== "crashed") return null;
  return {
    ...s,
    round_id: Number(s.round_id),
    round_number: Number(s.round_number),
    time_left: s.time_left != null ? Number(s.time_left) : undefined,
    current_multiplier: s.current_multiplier != null ? Number(s.current_multiplier) : undefined,
    crash_point: s.crash_point != null ? Number(s.crash_point) : undefined,
  };
}

export async function cashout(params: { round_id: number }) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/game/cashout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Cashout failed");
  return data as {
    bet: { id: number; round_id: number; bet_amount: string; status: string; cashout_multiplier: string | null; payout_amount: string };
    profile: { fake_wallet_balance: string; username: string; firebase_uid: string; platform_type: "WEB" | "APP" };
  };
}

export async function deposit(params: { amount: string }) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/wallet/deposit/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Deposit failed");
  return data as { profile: { fake_wallet_balance: string } };
}

export async function withdraw(params: { amount: string }) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/wallet/withdraw/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Withdraw failed");
  return data as { profile: { fake_wallet_balance: string } };
}

export type TransactionResponse = {
  id: number;
  amount: string;
  transaction_type: "DEPOSIT" | "WITHDRAW" | "BET" | "WIN";
  status: string;
  created_at: string;
};

export async function fetchTransactions() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/wallet/transactions/`, {
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return (data.transactions || []) as TransactionResponse[];
}

export type GameHistoryResponse = {
  id: number;
  round_id: number;
  bet_amount: string;
  cashout_multiplier: string | null;
  status: "PENDING" | "WON" | "LOST";
  payout_amount: string;
  created_at: string;
  crash_point: number;
};

export async function fetchGameHistory() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/game/history/`, {
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Failed to fetch game history");
  return (data.bets || []) as GameHistoryResponse[];
}
