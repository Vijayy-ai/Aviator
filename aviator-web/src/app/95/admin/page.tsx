"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import {
  adminChangePassword,
  adminLogin,
  adminWithdrawAction,
  fetchAdminSettings,
  fetchAdminUsers,
  fetchAdminWithdrawals,
  getAdminToken,
  setAdminToken,
  updateAdminSettings,
  type AdminUserRow,
  type WalletLimits,
  type WithdrawRequest,
} from "@/lib/api";

type Tab = "withdrawals" | "users" | "settings" | "password";

function money(v: string | number | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : "—";
}

function friendlyError(err: unknown) {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return "Server se connect nahi ho paya. Backend (port 8000) chal raha hai? Page refresh karke try karo.";
  }
  return msg;
}

function StatusPill({ status }: { status: WithdrawRequest["status"] }) {
  const map = {
    PENDING: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    APPROVED: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    REJECTED: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  } as const;
  const label = status === "APPROVED" ? "WITHDRAWN" : status;
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ring-1 ${map[status]}`}>
      {label}
    </span>
  );
}

export default function HiddenAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("withdrawals");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "">("PENDING");
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [limits, setLimits] = useState<WalletLimits | null>(null);
  const [minDeposit, setMinDeposit] = useState("500");
  const [minWithdraw, setMinWithdraw] = useState("1000");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wd, us, st] = await Promise.all([
        fetchAdminWithdrawals(statusFilter || undefined),
        fetchAdminUsers(),
        fetchAdminSettings(),
      ]);
      setRequests(wd);
      setUsers(us);
      setLimits(st);
      setMinDeposit(String(Number(st.min_deposit)));
      setMinWithdraw(String(Number(st.min_withdraw)));
      setAuthed(true);
      return true;
    } catch (e) {
      const msg = friendlyError(e);
      setError(msg);
      if (
        /admin login|authentication|unauthorized|invalid admin|401|403|denied/i.test(msg) ||
        /failed to fetch|server se connect/i.test(msg)
      ) {
        // Keep token only for auth errors that aren't network; network may be temporary
        if (/admin login|authentication|unauthorized|invalid admin|401|403|denied/i.test(msg)) {
          setAdminToken(null);
          setAuthed(false);
        }
      }
      return false;
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!getAdminToken()) {
      setAuthed(false);
      setChecking(false);
      return;
    }
    void load();
  }, [load]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "PENDING").length,
    [requests],
  );

  const totalWallet = useMemo(
    () => users.reduce((sum, u) => sum + (Number(u.fake_wallet_balance) || 0), 0),
    [users],
  );

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await adminLogin(password);
      setPassword("");
      const ok = await load();
      if (!ok) setAuthed(false);
    } catch (err) {
      setError(friendlyError(err));
      setAuthed(false);
    } finally {
      setSaving(false);
    }
  }

  async function onAction(id: number, action: "approve" | "reject") {
    try {
      setBusyId(id);
      setNotice(null);
      setError(null);
      await adminWithdrawAction({ id, action });
      setNotice(action === "approve" ? "Marked as withdrawn." : "Rejected — amount refunded to wallet.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setNotice(null);
      setError(null);
      const next = await updateAdminSettings({
        min_deposit: minDeposit,
        min_withdraw: minWithdraw,
      });
      setLimits(next);
      setNotice("Limits saved.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      await adminChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Password updated.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    setAdminToken(null);
    setAuthed(false);
    setRequests([]);
    setUsers([]);
    setNotice(null);
    setError(null);
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0f1115] text-sm font-semibold text-zinc-400">
        Checking admin session…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0f1115] px-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(244,63,94,0.18),_transparent_55%)]" />
        <form
          onSubmit={onLogin}
          className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#171a21] p-7 shadow-2xl shadow-black/40"
        >
          <BrandLogo
            className="flex items-center gap-2"
            imgClassName="h-7 w-7 object-contain"
            textClassName="text-[13px] font-bold uppercase tracking-[0.12em] text-rose-400"
          />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Admin access</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Password se seedha panel khulega. User login ki zaroorat nahi.
          </p>

          <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-zinc-400">
            Admin password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f1115] px-4 py-3.5 text-base font-semibold text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20"
            autoFocus
          />

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving || !password}
            className="mt-5 w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-extrabold text-white transition hover:bg-rose-400 active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? "Signing in…" : "Enter admin panel"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0f1115] text-zinc-100">
      <header className="border-b border-white/10 bg-[#171a21]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <BrandLogo
              className="mb-1 flex items-center gap-2"
              imgClassName="h-6 w-6 object-contain"
              textClassName="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-400"
            />
            <h1 className="text-xl font-extrabold tracking-tight text-white">Admin Panel</h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-200 active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#171a21] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pending withdraws</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{pendingCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#171a21] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Users</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{users.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#171a21] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total wallet</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{money(totalWallet)}</div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["withdrawals", "Withdraw requests"],
              ["users", "Users & wallets"],
              ["settings", "Min limits"],
              ["password", "Change password"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setError(null);
                setNotice(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold ring-1 transition active:scale-[0.98] ${
                tab === id
                  ? "bg-rose-500 text-white ring-rose-500"
                  : "bg-[#171a21] text-zinc-300 ring-white/10 hover:bg-[#1e222b]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#171a21] p-8 text-center text-sm font-semibold text-zinc-400">
            Loading…
          </div>
        ) : null}

        {!loading && tab === "withdrawals" ? (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["PENDING", "APPROVED", "REJECTED", ""] as const).map((s) => (
                <button
                  key={s || "ALL"}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                    statusFilter === s
                      ? "bg-white text-zinc-900 ring-white"
                      : "bg-[#171a21] text-zinc-400 ring-white/10"
                  }`}
                >
                  {s === "" ? "ALL" : s === "APPROVED" ? "WITHDRAWN" : s}
                </button>
              ))}
            </div>

            {requests.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#171a21] p-10 text-center text-sm font-semibold text-zinc-400">
                No withdraw requests in this filter.
              </div>
            ) : (
              requests.map((r) => (
                <article key={r.id} className="rounded-3xl border border-white/10 bg-[#171a21] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-extrabold tracking-tight text-white">{money(r.amount)}</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-300">
                        {r.username || "User"} · {r.email || "no email"}
                      </div>
                      <div className="mt-1 text-xs font-medium text-zinc-500">
                        #{r.id} · {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  <div className="mt-4 grid gap-2 rounded-2xl border border-white/5 bg-[#0f1115] p-4 text-sm text-zinc-300 md:grid-cols-2">
                    <div>
                      <span className="text-zinc-500">Method:</span> {r.payout_method}
                    </div>
                    {r.payout_method === "UPI" ? (
                      <div>
                        <span className="text-zinc-500">UPI:</span> {r.upi_id}
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-zinc-500">Name:</span> {r.account_name}
                        </div>
                        <div>
                          <span className="text-zinc-500">A/C:</span> {r.account_number}
                        </div>
                        <div>
                          <span className="text-zinc-500">IFSC:</span> {r.ifsc}
                        </div>
                        {r.bank_name ? (
                          <div>
                            <span className="text-zinc-500">Bank:</span> {r.bank_name}
                          </div>
                        ) : null}
                      </>
                    )}
                    <div>
                      <span className="text-zinc-500">Wallet now:</span> {money(r.wallet_balance)}
                    </div>
                  </div>

                  {r.status === "PENDING" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void onAction(r.id, "approve")}
                        className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {busyId === r.id ? "…" : "Mark withdrawn"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void onAction(r.id, "reject")}
                        className="rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-600 disabled:opacity-60"
                      >
                        Reject & refund
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </section>
        ) : null}

        {!loading && tab === "users" ? (
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#171a21]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5">
                      <td className="px-4 py-3 font-bold text-white">{u.username || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{u.email || "—"}</td>
                      <td className="px-4 py-3 text-zinc-300">{u.platform_type}</td>
                      <td className="px-4 py-3 font-extrabold text-white">{money(u.fake_wallet_balance)}</td>
                      <td className="px-4 py-3 text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!loading && tab === "settings" ? (
          <section className="max-w-lg rounded-3xl border border-white/10 bg-[#171a21] p-6">
            <h2 className="text-lg font-extrabold text-white">Deposit / Withdraw limits</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Current: deposit ≥ {money(limits?.min_deposit)} · withdraw ≥ {money(limits?.min_withdraw)}
            </p>
            <form onSubmit={onSaveSettings} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-zinc-400">Minimum deposit (₹)</label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={minDeposit}
                  onChange={(e) => setMinDeposit(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f1115] px-4 py-3 text-base font-bold text-white outline-none focus:border-rose-500/60"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-400">Minimum withdraw (₹)</label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={minWithdraw}
                  onChange={(e) => setMinWithdraw(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f1115] px-4 py-3 text-base font-bold text-white outline-none focus:border-rose-500/60"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-rose-400 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save limits"}
              </button>
            </form>
          </section>
        ) : null}

        {!loading && tab === "password" ? (
          <section className="max-w-lg rounded-3xl border border-white/10 bg-[#171a21] p-6">
            <h2 className="text-lg font-extrabold text-white">Change admin password</h2>
            <p className="mt-1 text-sm text-zinc-400">Password change ke baad purani sessions band ho jayengi.</p>
            <form onSubmit={onChangePassword} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-zinc-400">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f1115] px-4 py-3 text-base font-bold text-white outline-none focus:border-rose-500/60"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-400">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f1115] px-4 py-3 text-base font-bold text-white outline-none focus:border-rose-500/60"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-400">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f1115] px-4 py-3 text-base font-bold text-white outline-none focus:border-rose-500/60"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-rose-400 disabled:opacity-60"
              >
                {saving ? "Updating…" : "Update password"}
              </button>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
}
