"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "./Icons";

export default function Auth({ onSkip }: { onSkip: () => void }) {
  const { login, cloudEnabled } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await login(email, password, mode);
    setError(message);
    setBusy(false);
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <Logo size={34} />
          <div>
            <h1>Habit Tracker</h1>
            <p>Day · Week · Month · Year</p>
          </div>
        </div>

        {cloudEnabled ? (
          <form className="auth-box" onSubmit={submit}>
            <div className="auth-tabs">
              <button
                type="button"
                aria-pressed={mode === "login"}
                onClick={() => { setMode("login"); setError(null); }}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === "register"}
                onClick={() => { setMode("register"); setError(null); }}
              >
                Create account
              </button>
            </div>

            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
              />
            </div>

            {error && <span className="form-error">{error}</span>}

            <button className="btn btn-primary" type="submit" disabled={busy} style={{ height: 34 }}>
              {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            </button>

            <p className="hint" style={{ textAlign: "center", margin: 0 }}>
              Signing in syncs your habits across every device you install this on.
            </p>

            <div className="divider">or</div>

            <button type="button" className="btn" onClick={onSkip}>
              Use on this device only
            </button>
          </form>
        ) : (
          <div className="auth-box">
            <p className="hint" style={{ margin: 0, fontSize: 12.5 }}>
              No database is attached to this deployment yet, so accounts and cross-device
              sync are switched off. The tracker works right now and stores everything in
              this browser — connect Postgres later and your data moves up on first sign-in.
            </p>
            <button className="btn btn-primary" onClick={onSkip} style={{ height: 34 }}>
              Start tracking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
