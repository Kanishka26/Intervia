import { useState } from "react";
import { deleteAllData } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Settings() {
  const { user } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function wipe() {
    if (typed !== "DELETE" || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await deleteAllData();
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("intervia:session:"))
        .forEach((k) => sessionStorage.removeItem(k));
      setMessage(
        r.deleted === 1
          ? "Deleted 1 interview and your profile details."
          : `Deleted ${r.deleted} interviews and your profile details.`
      );
      setTyped("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold leading-tight">Settings</h1>

      <section>
        <h2 className="text-2xl font-semibold">Account</h2>
        <p className="mt-2">{user?.displayName || "Signed in"}</p>
        {user?.email && <p className="text-muted">{user.email}</p>}
      </section>

      <section>
        <h2 className="text-2xl font-semibold">What Intervia stores</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>The skills and projects it extracted from your resume and the job description.</li>
          <li>The questions you were asked, your answers (typed or transcribed), and the scores and feedback.</li>
          <li>Speaking and camera numbers, such as words per minute or the share of time facing the screen.</li>
          <li>The profile details you entered (name, college, skills, links).</li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          Not stored: the full text of your resume or job description, audio recordings, and video. Video stays in
          your browser and is never sent.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Delete my data</h2>
        <p className="mt-2">
          This permanently deletes all your interviews, reports, and profile details. It cannot be undone. It does
          not delete your sign-in account.
        </p>
        <label htmlFor="confirm" className="mt-4 block text-sm font-medium">
          Type DELETE to confirm
        </label>
        <input
          id="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="mt-1 w-full max-w-xs rounded-md border border-line bg-surface px-3 py-2"
        />
        <div className="mt-3">
          <button
            onClick={wipe}
            disabled={typed !== "DELETE" || busy}
            className="rounded-md bg-danger px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete all my interviews"}
          </button>
        </div>
        {message && <p role="status" className="mt-3 text-teal">{message}</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}