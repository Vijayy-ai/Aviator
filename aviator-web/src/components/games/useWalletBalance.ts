"use client";

import { useCallback, useEffect, useState } from "react";

import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { fetchMe } from "@/lib/api";

export function formatInr(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function useWalletBalance() {
  const { user, ready } = useFirebaseUser();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!ready) return;
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchMe();
      setBalance(res.profile.fake_wallet_balance);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [ready, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { balance, loading, reload, ready };
}
