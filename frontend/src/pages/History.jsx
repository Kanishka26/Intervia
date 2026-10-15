import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteSession, listSessions } from "../api.js";

const when = (t) =>
  new Date(t * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function History() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listSessions()
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id) {
    if (!window.confirm("Delete this interview and its report? This can't be undone.")) return;
    try {
      await deleteSession(id);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight">My interviews</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
          {error}
        </p>
      )}
      {!rows && !error && <p role="status" className="mt-4 text-muted">Loading…</p>}

      {rows && rows.length === 0 && (
        <p className="mt-4 text-muted">
          Nothing here yet.{" "}
          <Link to="/" className="font-medium text-teal underline">Start your first interview</Link>.
        </p>
      )}

      {rows && rows.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {rows.map((r) => {
            const done = r.status === "complete";
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.role || "Interview"}</p>
                  <p className="text-sm text-muted">
                    {when(r.created_at)} · {r.answers} answer{r.answers === 1 ? "" : "s"}
                    {r.overall != null ? ` · ${r.overall.toFixed(1)} / 5` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      done ? "border-teal text-teal" : "border-gold"
                    }`}
                  >
                    {done ? "Complete" : "In progress"}
                  </span>
                  <Link
                    to={done ? `/report/${r.id}` : `/interview/${r.id}`}
                    className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
                  >
                    {done ? "View report" : "Continue"}
                  </Link>
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="Delete interview"
                    className="rounded-md border border-line p-2 text-muted hover:text-danger"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}