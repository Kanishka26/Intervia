import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { firebaseConfigured } from "../firebase.js";

const MESSAGES = {
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups for this site and try again.",
  "auth/unauthorized-domain":
    "This address isn't authorised in Firebase. Add it under Authentication > Settings > Authorized domains.",
  "auth/operation-not-allowed": "Google sign-in isn't enabled in the Firebase console.",
  "auth/network-request-failed": "Network error while signing in. Check your connection.",
};

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function go() {
    setError("");
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
        setError(MESSAGES[e.code] || e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">Intervia</h1>
        <p className="mt-2 text-muted">Practice interviews built from your own resume. Sign in to save your sessions.</p>
        {!firebaseConfigured && (
          <p role="alert" className="mt-5 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            Firebase isn't configured. Fill in frontend/.env and restart the dev server.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          onClick={go}
          disabled={busy || !firebaseConfigured}
          className="mt-6 w-full rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Waiting for Google…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}