"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { deposit } from "@/lib/api";

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await deposit({ amount: val.toFixed(2) });
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileShell>
      <div className="flex h-14 items-center gap-3 bg-white px-4 shadow-sm">
        <button onClick={() => router.back()} className="text-2xl text-zinc-500">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to deposit"
              className="mt-2 block w-full rounded-xl bg-zinc-50 px-4 py-3 text-lg font-bold text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-rose-500"
              autoFocus
            />
          </div>
          {error && <div className="text-sm font-semibold text-rose-500">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-base font-extrabold text-white shadow-sm active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? "Processing..." : "Deposit Now"}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
