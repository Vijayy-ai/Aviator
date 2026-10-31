"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { fetchMe, fetchWalletLimits, withdraw } from "@/lib/api";

export default function WithdrawPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [minWithdraw, setMinWithdraw] = useState(1000);
  const [method, setMethod] = useState<"UPI" | "BANK">("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchWalletLimits(), fetchMe()])
      .then(([limits, me]) => {
        const n = Number(limits.min_withdraw);
        if (Number.isFinite(n) && n > 0) setMinWithdraw(n);
        const bal = Number(me.profile.fake_wallet_balance);
        if (Number.isFinite(bal)) setBalance(bal);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(amount);
    if (!Number.isFinite(val) || val < minWithdraw) {
      setError(`Minimum withdraw is ₹${minWithdraw.toFixed(2)}`);
      return;
    }
    if (balance != null && val > balance) {
      setError("Insufficient balance.");
      return;
    }
    if (method === "UPI" && !upiId.trim()) {
      setError("Please enter your UPI ID.");
      return;
    }
    if (method === "BANK" && (!accountName.trim() || !accountNumber.trim() || !ifsc.trim())) {
      setError("Please fill bank account name, number, and IFSC.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await withdraw({
        amount: val.toFixed(2),
        payout_method: method,
        upi_id: upiId.trim(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        ifsc: ifsc.trim(),
        bank_name: bankName.trim(),
      });
      setSuccess(res.detail || "Withdraw request submitted. Waiting for admin approval.");
      const nextBal = Number(res.profile.fake_wallet_balance);
      if (Number.isFinite(nextBal)) setBalance(nextBal);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileShell>
      <div className="flex h-14 items-center gap-3 bg-white px-4 shadow-sm">
        <button type="button" onClick={() => router.back()} className="text-2xl text-zinc-500">
          ‹
        </button>
        <h1 className="text-lg font-bold text-zinc-900">Withdraw</h1>
      </div>
      <div className="p-4">
        <form onSubmit={handleWithdraw} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/70">
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
            <div className="text-xs font-semibold text-zinc-500">Available balance</div>
            <div className="mt-1 text-xl font-extrabold text-zinc-900">
              ₹{balance == null ? "—" : balance.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-600">Amount (INR)</label>
            <input
              type="number"
              min={minWithdraw}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ₹${minWithdraw}`}
              className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-lg font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
              autoFocus
              disabled={loading}
            />
            <p className="mt-2 text-xs font-medium text-zinc-500">Minimum withdraw: ₹{minWithdraw.toFixed(2)}</p>
          </div>

          <div className="flex gap-2">
            {(["UPI", "BANK"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={loading}
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold ring-1 active:scale-[0.98] disabled:opacity-60 ${
                  method === m
                    ? "bg-rose-500 text-white ring-rose-500"
                    : "bg-zinc-50 text-zinc-700 ring-zinc-200"
                }`}
              >
                {m === "UPI" ? "UPI" : "Bank"}
              </button>
            ))}
          </div>

          {method === "UPI" ? (
            <div>
              <label className="block text-sm font-semibold text-zinc-600">UPI ID</label>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@upi"
                className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
                disabled={loading}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-zinc-600">Account holder name</label>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-600">Account number</label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-600">IFSC</label>
                <input
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-600">Bank name</label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {error ? <div className="text-sm font-semibold text-rose-500">{error}</div> : null}
          {success ? <div className="text-sm font-semibold text-emerald-600">{success}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-base font-extrabold text-white shadow-sm active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? "Submitting…" : "Withdraw now"}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
