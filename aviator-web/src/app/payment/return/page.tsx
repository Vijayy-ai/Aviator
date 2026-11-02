"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { fetchDepositOrderStatus } from "@/lib/api";

type PollState = "loading" | "paid" | "confirming" | "timeout" | "error";

function PaymentReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("order");

  const [state, setState] = useState<PollState>("loading");
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      setError("Missing order id.");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15; // 30s at 2s interval

    async function tick() {
      try {
        const data = await fetchDepositOrderStatus(orderId!);
        if (cancelled) return;
        if (data.status === "paid") {
          setBalance(data.balance);
          setState("paid");
          return;
        }
        setState("confirming");
        attempts += 1;
        if (attempts >= maxAttempts) {
          setState("timeout");
          return;
        }
        window.setTimeout(() => {
          void tick();
        }, 2000);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load payment status");
        setState("error");
      }
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <MobileShell>
      <div className="flex h-14 items-center gap-3 bg-white px-4 shadow-sm">
        <button type="button" onClick={() => router.push("/account")} className="text-2xl text-zinc-500">
          ‹
        </button>
        <h1 className="text-lg font-bold text-zinc-900">Payment</h1>
      </div>
      <div className="p-4">
        <div className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/70">
          {state === "loading" || state === "confirming" ? (
            <>
              <p className="text-base font-bold text-zinc-900">We&apos;re confirming your payment</p>
              <p className="text-sm font-medium text-zinc-500">
                Your credits will appear in a few seconds. Please wait…
              </p>
            </>
          ) : null}

          {state === "paid" ? (
            <>
              <p className="text-base font-bold text-emerald-600">Payment successful</p>
              <p className="text-sm font-medium text-zinc-600">
                New wallet balance: ₹{balance ?? "—"}
              </p>
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-base font-extrabold text-white"
              >
                Back to Account
              </button>
            </>
          ) : null}

          {state === "timeout" ? (
            <>
              <p className="text-base font-bold text-zinc-900">Still confirming</p>
              <p className="text-sm font-medium text-zinc-500">
                Payment may take a moment. Refresh this page or check your wallet shortly.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 w-full rounded-2xl bg-zinc-900 py-3 text-base font-extrabold text-white"
              >
                Refresh
              </button>
            </>
          ) : null}

          {state === "error" ? (
            <>
              <p className="text-base font-bold text-rose-500">Something went wrong</p>
              <p className="text-sm font-medium text-zinc-500">{error}</p>
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="mt-2 w-full rounded-2xl bg-zinc-900 py-3 text-base font-extrabold text-white"
              >
                Back to Account
              </button>
            </>
          ) : null}
        </div>
      </div>
    </MobileShell>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <MobileShell>
          <div className="p-4 text-sm font-semibold text-zinc-500">Loading…</div>
        </MobileShell>
      }
    >
      <PaymentReturnInner />
    </Suspense>
  );
}
