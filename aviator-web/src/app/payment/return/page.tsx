"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { fetchDepositOrderStatus } from "@/lib/api";

type PollState = "waiting_auth" | "loading" | "paid" | "confirming" | "timeout" | "error";

function PaymentReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("order");
  const razorpayPaymentId = params.get("razorpay_payment_id");
  const { user, ready } = useFirebaseUser();

  const [state, setState] = useState<PollState>("waiting_auth");
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      setError("Missing order id.");
      return;
    }
    if (!ready) {
      setState("waiting_auth");
      return;
    }
    if (!user) {
      setState("error");
      setError("Please log in again to see your updated balance. Your payment is safe — credits are added by the server.");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

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

    setState("loading");
    void tick();
    return () => {
      cancelled = true;
    };
  }, [orderId, ready, user]);

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
          {state === "waiting_auth" || state === "loading" || state === "confirming" ? (
            <>
              <p className="text-base font-bold text-zinc-900">
                {razorpayPaymentId ? "Payment received" : "We're confirming your payment"}
              </p>
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
                Payment may take a moment. Check Account → Transaction, or refresh.
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
              <p className="text-base font-bold text-rose-500">Could not show status</p>
              <p className="text-sm font-medium text-zinc-500">{error}</p>
              {razorpayPaymentId ? (
                <p className="text-sm font-medium text-emerald-700">
                  Razorpay payment id: {razorpayPaymentId}. If webhook ran, ₹ credit is already in your wallet — open Account to verify.
                </p>
              ) : null}
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
