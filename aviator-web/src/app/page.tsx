"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase";
import { firebaseLoginToBackend } from "@/lib/api";

type AuthMethod = "phone" | "email";

const REMEMBER_KEY = "daman_remember";

function prettyFirebaseAuthError(code?: string) {
  switch (code) {
    case "auth/invalid-credential":
      return "Wrong phone/email or password.";
    case "auth/user-not-found":
      return "Account not found. Tap Register.";
    case "auth/wrong-password":
      return "Wrong password.";
    case "auth/email-already-in-use":
      return "This number is already registered. Please log in.";
    case "auth/weak-password":
      return "Password is too weak (min 6 characters).";
    case "auth/invalid-email":
      return "Enter a valid phone number or email.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return null;
  }
}

function phoneToEmail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@phone.aviator.local`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
      {off ? <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> : null}
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#f95959]">
      <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 18h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#9aa0a6]">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#f95959]">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#f95959]">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 19c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DamanMark() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-white">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <path d="M6 8h12.5a8 8 0 0 1 0 16H6V8Z" fill="white" />
        <path d="M10 12h7a4 4 0 0 1 0 8h-7v-8Z" fill="#ff7a72" />
      </svg>
      <span className="text-[22px] font-extrabold tracking-tight">Daman</span>
    </div>
  );
}

const inputClass =
  "h-[48px] w-full rounded-lg border-0 bg-white px-3 text-[15px] text-zinc-800 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-[#f95959]";

export default function Home() {
  const [screen, setScreen] = useState<"login" | "register">("login");
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const invite = new URLSearchParams(window.location.search).get("invite");
      if (invite) {
        setInviteCode(invite);
        setScreen("register");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { method?: AuthMethod; phone?: string; email?: string };
      if (saved.method) setMethod(saved.method);
      if (saved.phone) setPhone(saved.phone);
      if (saved.email) setEmail(saved.email);
      setRemember(true);
    } catch {
      /* ignore */
    }
  }, []);

  function goLogin() {
    setScreen("login");
    setError(null);
    setNotice(null);
    setStatus("idle");
  }

  async function onForgot() {
    setError(null);
    setNotice(null);
    if (method === "phone") {
      setNotice("If you forget your password, please contact customer service.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setNotice("Password reset email sent.");
    } catch (err) {
      const anyErr = err as { code?: string };
      setError(prettyFirebaseAuthError(anyErr.code) || "Could not send reset email.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const phoneDigits = phone.replace(/\D/g, "");
    const usePhone = screen === "register" || method === "phone";
    if (usePhone && phoneDigits.length < 10) {
      setError("Please enter the phone number.");
      return;
    }
    if (!usePhone && !email.trim()) {
      setError("Enter your email.");
      return;
    }
    if (screen === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (screen === "register" && !agreed) {
      setError("Please agree to the Privacy Agreement.");
      return;
    }

    const loginEmail = usePhone ? phoneToEmail(phoneDigits) : email.trim();
    setStatus("loading");
    try {
      const cred = await withTimeout(
        screen === "register"
          ? createUserWithEmailAndPassword(firebaseAuth, loginEmail, password)
          : signInWithEmailAndPassword(firebaseAuth, loginEmail, password),
        20000,
        "Sign-in timed out. Check your connection and try again.",
      );
      const idToken = await cred.user.getIdToken();
      await firebaseLoginToBackend({
        idToken,
        source: "web",
        inviteCode: screen === "register" ? inviteCode.trim() : undefined,
        phone: usePhone ? phoneDigits : undefined,
      });
      try {
        if (remember && screen === "login") {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ method, phone: phoneDigits, email: email.trim() }));
        } else if (!remember) {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* ignore */
      }
      window.location.href = "/lobby";
    } catch (err) {
      const anyErr = err as { code?: string; message?: string };
      const friendly = prettyFirebaseAuthError(anyErr?.code);
      setError(friendly || (err instanceof Error ? err.message : "Auth failed"));
      setStatus("idle");
    }
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-[#6d6d76]">
    <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[#f3f4f8] text-zinc-900">
      <header className="relative shrink-0 bg-gradient-to-b from-[#ff8d86] to-[#ff6d66] px-4 pb-8 pt-3 text-white">
        <div className="flex h-10 items-center">
          {screen === "register" ? (
            <button type="button" aria-label="Back" onClick={goLogin} className="flex h-9 w-9 items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M15 6 9 12l6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <span className="w-9" />
          )}
          <div className="flex flex-1 justify-center pr-9">
            <DamanMark />
          </div>
        </div>
        <h1 className="mt-3 text-[26px] font-bold leading-none">{screen === "login" ? "Log in" : "Register"}</h1>
        <p className="mt-2 max-w-[280px] text-[13px] leading-5 text-white/95">
          {screen === "login" ? (
            <>
              Please log in with your phone number or email
              <br />
              If you forget your password, please contact customer service
            </>
          ) : (
            "Please register by phone number or email"
          )}
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-5">
        {screen === "login" ? (
          <div className="mb-5 grid grid-cols-2 border-b border-zinc-200">
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className={["flex flex-col items-center gap-1 pb-2 text-[15px] font-semibold", method === "phone" ? "text-[#f95959]" : "text-zinc-500"].join(" ")}
            >
              <PhoneIcon />
              Phone Number
              <span className={["mt-1 h-[3px] w-16 rounded-full", method === "phone" ? "bg-[#f95959]" : "bg-transparent"].join(" ")} />
            </button>
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={["flex flex-col items-center gap-1 pb-2 text-[15px] font-semibold", method === "email" ? "text-[#f95959]" : "text-zinc-500"].join(" ")}
            >
              <MailIcon />
              Email
              <span className={["mt-1 h-[3px] w-16 rounded-full", method === "email" ? "bg-[#f95959]" : "bg-transparent"].join(" ")} />
            </button>
          </div>
        ) : (
          <div className="mb-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center">
              <PhoneIcon />
            </div>
            <div className="mt-1 text-[16px] font-semibold text-[#f95959]">Register your phone</div>
            <div className="mx-auto mt-2 h-[2px] w-full max-w-[220px] bg-[#f95959]" />
          </div>
        )}

        <div className="space-y-4">
          {screen === "register" || method === "phone" ? (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[15px] font-medium text-zinc-700">
                <PhoneIcon /> Phone number
              </span>
              <div className="flex gap-2">
                <div className="flex h-[48px] w-[92px] items-center justify-center gap-1 rounded-lg bg-white text-[15px] font-semibold text-zinc-700 ring-1 ring-zinc-200">
                  +91
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                    <path d="M2 4.5 6 8l4-3.5" stroke="#888" strokeWidth="1.4" fill="none" />
                  </svg>
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="Please enter the phone number"
                  className={inputClass}
                />
              </div>
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[15px] font-medium text-zinc-700">
                <MailIcon /> Email
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="Please enter your email"
                className={inputClass}
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[15px] font-medium text-zinc-700">
              <LockIcon /> {screen === "register" ? "Set password" : "Password"}
            </span>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete={screen === "register" ? "new-password" : "current-password"}
                placeholder={screen === "register" ? "Set password" : "Password"}
                className={`${inputClass} pr-12`}
                minLength={6}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
              >
                <EyeIcon off={!showPassword} />
              </button>
            </div>
          </label>

          {screen === "register" ? (
            <>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[15px] font-medium text-zinc-700">
                  <LockIcon /> Confirm password
                </span>
                <div className="relative">
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className={`${inputClass} pr-12`}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
                  >
                    <EyeIcon off={!showConfirm} />
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[15px] font-medium text-zinc-700">
                  <UserIcon /> Invite code
                </span>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                  autoComplete="off"
                />
              </label>
              <label className="flex items-start gap-2 pt-1 text-[13px] text-zinc-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#f95959]"
                />
                <span>
                  I have read and agree{" "}
                  <button type="button" className="font-semibold text-[#f95959]" onClick={() => setShowPrivacy(true)}>
                    【Privacy Agreement】
                  </button>
                </span>
              </label>
            </>
          ) : (
            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-zinc-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-[#f95959]"
                />
                Remember password
              </label>
              <button type="button" onClick={() => void onForgot()} className="font-medium text-[#f95959]">
                Forgot password?
              </button>
            </div>
          )}

          {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
          {notice ? <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</div> : null}

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-2 h-[50px] w-full rounded-full bg-gradient-to-r from-[#ff8a82] to-[#f95959] text-[18px] font-bold text-white shadow-sm disabled:opacity-70"
          >
            {status === "loading" ? "Please wait..." : screen === "register" ? "Register" : "Log in"}
          </button>

          {screen === "login" ? (
            <button
              type="button"
              onClick={() => {
                setScreen("register");
                setError(null);
                setNotice(null);
              }}
              className="h-[50px] w-full rounded-full border-2 border-[#f95959] bg-white text-[18px] font-bold text-[#f95959]"
            >
              Register
            </button>
          ) : null}
        </div>
      </form>

      {showPrivacy ? (
        <div className="absolute inset-0 z-20 flex items-end bg-black/40" onClick={() => setShowPrivacy(false)}>
          <div className="w-full rounded-t-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold">Privacy Agreement</div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Your phone number and password are used only to sign in to this account. Do not share your password. Invite codes are optional.
            </p>
            <button type="button" onClick={() => setShowPrivacy(false)} className="mt-4 h-11 w-full rounded-full bg-[#f95959] font-bold text-white">
              I agree
            </button>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}
