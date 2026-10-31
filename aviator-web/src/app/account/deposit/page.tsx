"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { createRazorpayOrder, fetchWalletLimits, verifyRazorpayPayment } from "@/lib/api";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";

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
      setStatus("Creating order…");

      const order = await createRazorpayOrder({ amount: val.toFixed(2), currency: "INR" });
      const key =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
        order.key_id?.trim() ||
        "";
      if (!key) {
        throw new Error("Razorpay key is not configured");
      }

      setStatus("Opening payment…");
      await loadRazorpayScript();

      await new Promise<void>((resolve, reject) => {
        const rzp = openRazorpayCheckout({
          key,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "Tc Lottery",
          description: `Wallet deposit ₹${val.toFixed(2)}`,
          order_id: order.order_id,
          theme: { color: "#f95959" },
          handler: (response) => {
            void (async () => {
              try {
                setStatus("Verifying payment…");
                await verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                setStatus("Payment successful");
                resolve();
                router.push("/account");
              } catch (err) {
                reject(err instanceof Error ? err : new Error("Verification failed"));
              }
            })();
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled"));
            },
          },
        });

        rzp.on("payment.failed", (response) => {
          const msg = response?.error?.description || response?.error?.reason || "Payment failed";
          reject(new Error(msg));
        });

        rzp.open();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      if (message !== "Payment cancelled") {
        setError(message);
      } else {
        setError("Payment was cancelled.");
      }
      setStatus(null);
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
            {loading ? "Processing…" : "Deposit Amount"}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
