"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { fetchTransactions, type TransactionResponse } from "@/lib/api";

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
        setTxs(data);
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
        <button onClick={() => router.back()} className="text-2xl text-zinc-500">
          ‹
        </button>
        <h1 className="text-lg font-bold text-zinc-900">Transaction History</h1>
      </div>
      <div className="p-4">
        {error && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-500 ring-1 ring-rose-200">{error}</div>}
        
        {loading ? (
          <div className="text-center text-sm font-semibold text-zinc-500 py-10">Loading...</div>
        ) : txs.length === 0 ? (
          <div className="text-center text-sm font-semibold text-zinc-500 py-10">No transactions found.</div>
        ) : (
          <div className="space-y-3">
            {txs.map((tx) => {
              const isPositive = tx.transaction_type === "DEPOSIT" || tx.transaction_type === "WIN";
              const date = new Date(tx.created_at);
              return (
                <div key={tx.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70">
                  <div>
                    <div className="font-bold text-zinc-900">{tx.transaction_type}</div>
                    <div className="text-xs text-zinc-500 mt-1">{date.toLocaleString()}</div>
                    <div className="text-xs font-semibold mt-1">Status: {tx.status}</div>
                  </div>
                  <div className={`text-lg font-extrabold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                    {isPositive ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
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
