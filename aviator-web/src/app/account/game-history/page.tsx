"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { fetchGameHistory, type GameHistoryResponse } from "@/lib/api";

export default function GameHistoryPage() {
  const router = useRouter();
  const [bets, setBets] = useState<GameHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchGameHistory()
      .then((data) => {
        if (!mounted) return;
        setBets(data);
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
        <h1 className="text-lg font-bold text-zinc-900">Game History</h1>
      </div>
      <div className="p-4">
        {error && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-500 ring-1 ring-rose-200">{error}</div>}
        
        {loading ? (
          <div className="text-center text-sm font-semibold text-zinc-500 py-10">Loading...</div>
        ) : bets.length === 0 ? (
          <div className="text-center text-sm font-semibold text-zinc-500 py-10">No game history found. Play Aviator to see your bets here!</div>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => {
              const date = new Date(bet.created_at);
              const isWon = bet.status === "WON";
              return (
                <div key={bet.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-extrabold text-sm text-zinc-900">Round #{bet.round_id}</div>
                    <div className="text-xs font-bold text-zinc-500">{date.toLocaleString()}</div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-zinc-50 p-3 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-semibold mb-1">Bet</span>
                      <span className="text-sm font-extrabold text-zinc-900">₹{Number(bet.bet_amount).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-zinc-500 font-semibold mb-1">Crash Point</span>
                      <span className={`text-sm font-extrabold px-2 py-0.5 rounded-full ${bet.crash_point >= 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        {bet.crash_point.toFixed(2)}x
                      </span>
                    </div>
                    
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-zinc-500 font-semibold mb-1">Payout</span>
                      <span className={`text-sm font-extrabold ${isWon ? "text-emerald-500" : "text-rose-500"}`}>
                        {isWon ? `+₹${Number(bet.payout_amount).toFixed(2)}` : "-₹" + Number(bet.bet_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {isWon && (
                    <div className="mt-2 flex justify-end">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        Cashed out @ {bet.cashout_multiplier}x
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
