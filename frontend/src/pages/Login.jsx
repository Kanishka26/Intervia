import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { firebaseConfigured } from "../firebase.js";

const MESSAGES = {
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups for this site and try again.",
  "auth/unauthorized-domain":
    "This address isn't authorised in Firebase. Add it under Authentication > Settings > Authorized domains.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled in the Firebase console.",
  "auth/network-request-failed": "Network error while signing in. Check your connection.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
};

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base";
const errorBox =
  "mt-5 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger";

export default function Login() {
  const { user, loading, signIn, signInEmail, signUpEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const from = useLocation().state?.from || "/dashboard";

  if (!loading && user) return <Navigate to={from} replace />;

  const signup = mode === "signup";

  function switchMode() {
    setMode(signup ? "signin" : "signup");
    setError("");
    setNotice("");
    setUsername("");
    setPassword("");
    setConfirm("");
  }

  function fail(e) {
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
      setError(MESSAGES[e.code] || e.message);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");

    if (signup) {
      const name = username.trim();
      if (name.length < 3 || name.length > 30) {
        setError("Username must be 3 to 30 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (signup) await signUpEmail(email.trim(), password, username.trim());
      else await signInEmail(email.trim(), password);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await signIn();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    try {
      await resetPassword(email.trim());
      setNotice("If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      fail(err);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">Intervia</h1>
        <p className="mt-2 text-muted">
          Practice interviews built from your own resume.{" "}
          {signup ? "Create an account to save your sessions." : "Sign in to save your sessions."}
        </p>

        {!firebaseConfigured && (
          <p role="alert" className={errorBox}>
            Firebase isn't configured. Fill in frontend/.env and restart the dev server.
          </p>
        )}
        {error && <p role="alert" className={errorBox}>{error}</p>}
        {notice && (
          <p role="status" className="mt-5 rounded-md border border-line bg-paper px-3 py-2 text-sm">
            {notice}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {signup && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
                className={input}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className={input}
            />
          </div>
          {signup && (
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium">Confirm password</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
                className={input}
              />
            </div>
          )}
          {!signup && (
            <button type="button" onClick={forgot} className="text-sm font-medium text-teal underline">
              Forgot password?
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !firebaseConfigured}
            className="w-full rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy || !firebaseConfigured}
          className="w-full rounded-md border border-line bg-surface px-5 py-2.5 font-medium hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          {signup ? "Already have an account?" : "New here?"}{" "}
          <button type="button" onClick={switchMode} className="font-medium text-teal underline">
            {signup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}