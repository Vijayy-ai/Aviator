"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { createDepositCheckout, fetchWalletLimits } from "@/lib/api";

const QUICK_AMOUNTS = ["500", "1000", "2000", "5000"];

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [minDeposit, setMinDeposit] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void fetchWalletLimits()
      .then((limits) => {
        const n = Number(limits.min_deposit);
        if (Number.isFinite(n) && n > 0) setMinDeposit(n);
      })
      .catch(() => {
        /* keep default 500 */
      });
  }, []);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(amount);
    if (!Number.isFinite(val) || val < minDeposit) {
      setError(`Minimum deposit is ₹${minDeposit.toFixed(2)}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStatus("Creating payment link…");

      const { url } = await createDepositCheckout({ amount: val.toFixed(2) });
      if (!url) throw new Error("No payment URL returned");

      setStatus("Redirecting to Razorpay…");
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      setError(message);
      setStatus(null);
      setLoading(false);
    }
  }

  return (
    <MobileShell>
      <div className="flex h-14 items-center gap-3 bg-white px-4 shadow-sm">
        <button type="button" onClick={() => router.back()} className="text-2xl text-zinc-500">
          ‹
        </button>
        <h1 className="text-lg font-bold text-zinc-900">Deposit</h1>
      </div>
      <div className="p-4">
        <form onSubmit={handleDeposit} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/70">
          <div>
            <label className="block text-sm font-semibold text-zinc-600">Amount (INR)</label>
            <input
              type="number"
              min={minDeposit}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ₹${minDeposit}`}
              className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-lg font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
              autoFocus
              disabled={loading}
            />
            <p className="mt-2 text-xs font-medium text-zinc-500">Minimum deposit: ₹{minDeposit.toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                disabled={loading}
                onClick={() => setAmount(a)}
                className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200 active:scale-[0.98] disabled:opacity-60"
              >
                ₹{a}
              </button>
            ))}
          </div>

          {status ? <div className="text-sm font-semibold text-zinc-500">{status}</div> : null}
          {error ? <div className="text-sm font-semibold text-rose-500">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-base font-extrabold text-white shadow-sm active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? "Redirecting…" : "Deposit Amount"}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
