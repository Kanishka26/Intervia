import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
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
  const { user, isEmployer, loading, signInGoogleCandidate, signInCandidate, signUpCandidate, resetPassword } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const from = useLocation().state?.from || (isEmployer ? "/employer" : "/dashboard");

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
      if (signup) await signUpCandidate(email.trim(), password, username.trim());
      else await signInCandidate(email.trim(), password);
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
      await signInGoogleCandidate();
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
      setError("Type your email above first, then click 'Forgot password?'.");
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
        {/* Role Portal Switcher Tab */}
        <div className="flex rounded-xl bg-paper p-1 mb-5 text-xs font-bold">
          <div className="flex-1 rounded-lg py-1.5 text-center bg-surface text-ink shadow-xs">
            🎓 Candidate
          </div>
          <Link
            to="/employer/login"
            className="flex-1 rounded-lg py-1.5 text-center text-muted hover:text-ink transition-colors"
          >
            💼 Recruiter &rarr;
          </Link>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-teal">Intervia</h1>
        <p className="mt-2 text-muted">
          Practice interviews built from your own resume.{" "}
          {signup ? "Create a candidate account to save your sessions." : "Sign in to save your sessions."}
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
                className={`mt-1 ${input}`}
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
              className={`mt-1 ${input}`}
            />
          </div>

          <div>
            <label htmlFor="pass" className="block text-sm font-medium">Password</label>
            <input
              id="pass"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 ${input}`}
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
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`mt-1 ${input}`}
              />
            </div>
          )}

          {!signup && (
            <div className="text-right">
              <button
                type="button"
                onClick={forgot}
                className="text-xs text-muted underline hover:text-ink"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !firebaseConfigured}
            className="w-full rounded-md bg-teal py-2.5 font-medium text-white hover:bg-teal/90 disabled:opacity-50"
          >
            {busy ? "Signing in…" : signup ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs uppercase tracking-wider text-muted">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy || !firebaseConfigured}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface py-2.5 font-medium hover:bg-paper disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          {signup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-medium text-teal underline"
          >
            {signup ? "Sign in" : "Sign up"}
          </button>
        </p>

        <div className="mt-4 pt-4 border-t border-line text-center">
          <Link to="/employer/login" className="text-xs text-muted hover:text-teal font-semibold">
            Are you a recruiter? <strong>Sign in to Employer Hub &rarr;</strong>
          </Link>
        </div>
      </div>
    </div>
  );
}
