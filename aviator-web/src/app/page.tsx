"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase";
import { firebaseLoginToBackend } from "@/lib/api";

function prettyFirebaseAuthError(code?: string) {
  switch (code) {
    case "auth/invalid-credential":
      return "Wrong email or password. If you don’t have an account, tap Register.";
    case "auth/user-not-found":
      return "Account not found. Tap Register to create one.";
    case "auth/wrong-password":
      return "Wrong password.";
    case "auth/email-already-in-use":
      return "This email is already registered. Please Sign in.";
    case "auth/weak-password":
      return "Password is too weak (min 6 characters).";
    default:
      return null;
  }
}

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    username: string;
    firebase_uid: string;
    platform_type: "WEB" | "APP";
    fake_wallet_balance: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    try {
      const trimmedEmail = email.trim();
      const cred =
        mode === "register"
          ? await createUserWithEmailAndPassword(firebaseAuth, trimmedEmail, password)
          : await signInWithEmailAndPassword(firebaseAuth, trimmedEmail, password);
      const idToken = await cred.user.getIdToken();
      const res = await firebaseLoginToBackend({ idToken, source: "web" });
      setProfile(res.profile);
      window.location.href = "/lobby";
    } catch (err) {
      const anyErr = err as { code?: string; message?: string };
      const friendly = prettyFirebaseAuthError(anyErr?.code);
      const message = friendly || (err instanceof Error ? err.message : "Auth failed");
      setError(message);
      setProfile(null);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-500 text-zinc-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] justify-center sm:py-6">
        <div className="relative flex w-full flex-col bg-white sm:rounded-[28px] sm:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.35)] sm:ring-1 sm:ring-zinc-200">
          <div className="flex flex-1 flex-col px-5 py-8 sm:justify-center">
          <div className="mb-7 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-1 text-xs font-semibold text-white">
              Aviator <span className="text-white/80">•</span> WEB
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
              {mode === "login" ? "Log in" : "Register"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Firebase sign-in + Django verification. Cross-login between App/Web is blocked.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={[
                "h-10 rounded-xl text-sm font-semibold",
                mode === "login"
                  ? "bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-sm"
                  : "text-zinc-600",
              ].join(" ")}
              disabled={status === "loading"}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={[
                "h-10 rounded-xl text-sm font-semibold",
                mode === "register"
                  ? "bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-sm"
                  : "text-zinc-600",
              ].join(" ")}
              disabled={status === "loading"}
            >
              Register
            </button>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-zinc-700">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-300"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-zinc-700">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-300"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {profile ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="font-medium">Welcome, {profile.username}</div>
              <div className="mt-1 text-xs text-emerald-700">
                Wallet: {profile.fake_wallet_balance} • Platform: {profile.platform_type}
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={status === "loading"}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
          >
            {status === "loading"
              ? mode === "register"
                ? "Creating account..."
                : "Signing in..."
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-500">
            By continuing, you agree to the platform rules.
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
