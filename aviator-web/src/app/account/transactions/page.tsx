"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { fetchTransactions, type TransactionResponse } from "@/lib/api";

function statusLabel(status: string) {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "Successful";
  if (s === "PENDING") return "Pending";
  if (s === "FAILED") return "Failed / Rejected";
  return status;
}

function typeLabel(type: string) {
  if (type === "DEPOSIT") return "Deposit";
  if (type === "WITHDRAW") return "Withdrawal";
  return type;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [txs, setTxs] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchTransactions()
      .then((data) => {
        if (!mounted) return;
        // Backend already filters, but keep a client guard.
        setTxs(data.filter((t) => t.transaction_type === "DEPOSIT" || t.transaction_type === "WITHDRAW"));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MobileShell>
      <div className="flex h-14 items-center gap-3 bg-white px-4 shadow-sm">
        <button type="button" onClick={() => router.back()} className="text-2xl text-zinc-500">
          ‹
        </button>
        <h1 className="text-lg font-bold text-zinc-900">Transaction History</h1>
      </div>
      <div className="p-4">
        <p className="mb-3 text-xs font-medium text-zinc-500">
          Deposits and withdrawals only. Game bets and wins are in Game History.
        </p>
        {error ? (
          <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-500 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="py-10 text-center text-sm font-semibold text-zinc-500">Loading...</div>
        ) : txs.length === 0 ? (
          <div className="py-10 text-center text-sm font-semibold text-zinc-500">No transactions found.</div>
        ) : (
          <div className="space-y-3">
            {txs.map((tx) => {
              const isDeposit = tx.transaction_type === "DEPOSIT";
              const date = new Date(tx.created_at);
              const status = statusLabel(tx.status);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70"
                >
                  <div>
                    <div className="font-bold text-zinc-900">{typeLabel(tx.transaction_type)}</div>
                    <div className="mt-1 text-xs text-zinc-500">{date.toLocaleString()}</div>
                    <div
                      className={`mt-1 text-xs font-semibold ${
                        status === "Successful"
                          ? "text-emerald-600"
                          : status === "Pending"
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {status}
                    </div>
                  </div>
                  <div className={`text-lg font-extrabold ${isDeposit ? "text-emerald-500" : "text-rose-500"}`}>
                    {isDeposit ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
