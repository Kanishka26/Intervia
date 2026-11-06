import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteSession, listSessions } from "../api.js";

const when = (t) =>
  new Date(t * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function History() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'complete' | 'in_progress'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'score'
  const [deletingId, setDeletingId] = useState(null);

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
    try {
      await deleteSession(id);
      setRows((r) => r.filter((x) => x.id !== id));
      setDeletingId(null);
    } catch (e) {
      setError(e.message);
    }
  }

  // Filtered & sorted rows
  const filteredRows = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => {
        const matchesSearch =
          (r.role || "Technical Interview").toLowerCase().includes(search.toLowerCase()) ||
          r.id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "complete" && r.status === "complete") ||
          (filterStatus === "in_progress" && r.status !== "complete");
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "score") {
          return (b.overall || 0) - (a.overall || 0);
        }
        return (b.created_at || 0) - (a.created_at || 0);
      });
  }, [rows, search, filterStatus, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const completed = rows.filter((r) => r.status === "complete" && r.overall != null);
    const avgScore =
      completed.length > 0
        ? (completed.reduce((acc, r) => acc + r.overall, 0) / completed.length).toFixed(1)
        : null;
    const bestScore =
      completed.length > 0
        ? Math.max(...completed.map((r) => r.overall)).toFixed(1)
        : null;

    return {
      total: rows.length,
      completed: completed.length,
      avgScore,
      bestScore,
    };
  }, [rows]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
            My Interviews
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track and review your simulated technical interviews, transcripts, and evaluation history.
          </p>
        </div>

        <Link
          to="/new"
          className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark transition-all"
        >
          <Plus size={16} />
          <span>New Interview</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Sessions</span>
            <p className="mt-2 font-display text-3xl font-black text-ink">{stats.total}</p>
            <span className="text-[11px] text-muted">Interviews initiated</span>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Completed</span>
            <p className="mt-2 font-display text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.completed}
            </p>
            <span className="text-[11px] text-muted">Fully evaluated</span>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Average Score</span>
            <p className="mt-2 font-display text-3xl font-black text-teal">
              {stats.avgScore ? `${stats.avgScore}` : "—"}
              {stats.avgScore && <span className="text-sm font-bold text-muted"> / 5.0</span>}
            </p>
            <span className="text-[11px] text-muted">Overall competency</span>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Peak Score</span>
            <p className="mt-2 font-display text-3xl font-black text-amber-500">
              {stats.bestScore ? `${stats.bestScore}` : "—"}
              {stats.bestScore && <span className="text-sm font-bold text-muted"> / 5.0</span>}
            </p>
            <span className="text-[11px] text-muted">Best round performance</span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role or ID…"
            className="w-full rounded-xl bg-paper/60 pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex rounded-xl bg-paper p-1 text-xs font-semibold border border-line/60">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filterStatus === "all" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("complete")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filterStatus === "complete" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("in_progress")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filterStatus === "in_progress" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              In Progress
            </button>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
          >
            <option value="newest">Most Recent</option>
            <option value="score">Highest Score</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {!rows && !error && (
        <div className="py-20 text-center text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-teal border-t-transparent" />
          <p className="text-sm">Loading your interview archive…</p>
        </div>
      )}

      {/* Empty State */}
      {rows && rows.length === 0 && (
        <div className="rounded-3xl border border-line bg-surface p-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-teal/10 text-teal">
            <Code2 size={32} />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">No interviews recorded yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Kick off your first simulated AI interview to practice questions tailored to your target job and receive deep competency analytics.
          </p>
          <div className="mt-6">
            <Link
              to="/new"
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3 font-display text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark"
            >
              <Sparkles size={16} />
              <span>Launch First Interview</span>
            </Link>
          </div>
        </div>
      )}

      {/* Filtered Empty State */}
      {rows && rows.length > 0 && filteredRows.length === 0 && (
        <div className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">
          <p className="text-sm">No interviews found matching "{search}".</p>
          <button
            onClick={() => {
              setSearch("");
              setFilterStatus("all");
            }}
            className="mt-2 text-xs font-bold text-teal underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Interview Cards List */}
      {filteredRows.length > 0 && (
        <div className="grid gap-4">
          {filteredRows.map((r) => {
            const isDone = r.status === "complete";
            const score = r.overall;
            const isConfirmingDelete = deletingId === r.id;

            return (
              <div
                key={r.id}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs hover:border-teal/40 hover:shadow-md transition-all duration-200"
              >
                {/* Left side: Role info & date */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper text-teal border border-line/80 font-bold group-hover:bg-teal/10 transition-colors">
                    <Code2 size={24} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-ink">
                        {r.role || "Technical Practice Interview"}
                      </h3>

                      {isDone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={12} />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <Clock size={12} />
                          In Progress
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {when(r.created_at)}
                      </span>
                      <span>·</span>
                      <span>
                        {r.answers || 0} answer{r.answers === 1 ? "" : "s"} submitted
                      </span>
                      <span>·</span>
                      <span className="font-mono text-[11px] text-muted">#{r.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Score & Action buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-line/60">
                  {isDone && score != null ? (
                    <div className="text-right sm:mr-3">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-black text-teal">
                          {score.toFixed(1)}
                        </span>
                        <span className="text-xs font-bold text-muted">/ 5.0</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                        Score
                      </span>
                    </div>
                  ) : null}

                  <Link
                    to={isDone ? `/report/${r.id}` : `/interview/${r.id}`}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
                      isDone
                        ? "bg-teal text-white hover:bg-teal-dark shadow-teal/15"
                        : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/15"
                    }`}
                  >
                    <span>{isDone ? "View Report" : "Resume"}</span>
                    <ArrowRight size={14} />
                  </Link>

                  {/* Delete button or confirmation */}
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1 rounded-xl bg-danger/10 border border-danger/30 p-1">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="rounded-lg bg-danger px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="rounded-lg px-2 py-1 text-xs text-muted hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(r.id)}
                      title="Delete interview session"
                      className="rounded-xl border border-line bg-surface p-2.5 text-muted hover:border-danger/30 hover:bg-danger/10 hover:text-danger transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
