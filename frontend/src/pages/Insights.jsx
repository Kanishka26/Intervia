import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Flame,
  Lightbulb,
  Mic,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInsights } from "../api.js";
import ScoreBar from "../components/ScoreBar.jsx";
import TrendChart from "../components/TrendChart.jsx";

const DIM_META = {
  relevance: { label: "Relevance", desc: "Precision and adherence to what was asked" },
  technical_depth: { label: "Technical Depth", desc: "Underlying principles, scalability & systems knowledge" },
  clarity: { label: "Communication Clarity", desc: "Structured expression and concise explanations" },
  completeness: { label: "Completeness", desc: "Edge case handling and trade-off considerations" },
};

const TYPE_META = {
  technical: { label: "Technical Coding & Theory", icon: "💻" },
  project: { label: "Project & System Architecture", icon: "🏗️" },
  behavioral: { label: "Behavioral & Culture Fit", icon: "🤝" },
  problem_solving: { label: "Problem Solving & Algorithmic", icon: "🧩" },
};

export default function Insights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getInsights()
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
            Skill Growth & Insights
          </h1>
          <p className="mt-1 text-sm text-muted">
            Continuous competency tracking, question-type diagnostics, and delivery patterns across your interviews.
          </p>
        </div>

        <Link
          to="/new"
          className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark transition-all"
        >
          <Sparkles size={16} />
          <span>Practice Weak Areas</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {!data && !error && (
        <div className="py-20 text-center text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-teal border-t-transparent" />
          <p className="text-sm">Analyzing your interview metrics…</p>
        </div>
      )}

      {/* Zero interviews state */}
      {data && data.interviews === 0 && (
        <div className="rounded-3xl border border-line bg-surface p-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-teal/10 text-teal">
            <BarChart3 size={32} />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">No interview analytics yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Skill insights automatically aggregate your rubric ratings, question styles, and speaking metrics as soon as you finish your first interview.
          </p>
          <div className="mt-6">
            <Link
              to="/new"
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3 font-display text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark"
            >
              <Zap size={16} />
              <span>Start Your First Interview</span>
            </Link>
          </div>
        </div>
      )}

      {/* Populated Analytics Dashboard */}
      {data && data.interviews > 0 && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Readiness Level</span>
              <p className="mt-2 font-display text-3xl font-black text-teal">
                {data.average ? `${data.average.toFixed(1)}` : "—"}
                <span className="text-sm font-bold text-muted"> / 5.0</span>
              </p>
              <span className="text-[11px] text-muted">Mean across all sessions</span>
            </div>

            <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Sessions Completed</span>
              <p className="mt-2 font-display text-3xl font-black text-ink">{data.interviews}</p>
              <span className="text-[11px] text-muted">{data.answers} technical answers</span>
            </div>

            <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Speech Pace</span>
              <p className="mt-2 font-display text-3xl font-black text-ink">
                {data.speech?.avg_wpm ? `${data.speech.avg_wpm}` : "—"}
                {data.speech?.avg_wpm && <span className="text-sm font-bold text-muted"> WPM</span>}
              </p>
              <span className="text-[11px] text-muted">Target: 120 - 170 WPM</span>
            </div>

            <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Filler Density</span>
              <p className="mt-2 font-display text-3xl font-black text-amber-500">
                {data.speech?.filler_per_100_words != null ? `${data.speech.filler_per_100_words}` : "0"}
              </p>
              <span className="text-[11px] text-muted">per 100 words</span>
            </div>
          </div>

          {/* Historical Trend Chart Section */}
          {data.trend?.length > 1 && (
            <section className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-line">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">Performance Trajectory</h2>
                  <p className="text-xs text-muted">Session-by-session overall score progression over time</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal">
                  <TrendingUp size={14} />
                  {data.trend[data.trend.length - 1].overall >= data.trend[0].overall
                    ? "Upward Trend"
                    : "Steady Progress"}
                </span>
              </div>

              <div className="pt-2">
                <TrendChart data={data.trend} height={260} />
              </div>
            </section>
          )}

          {/* 2-Column: Core Dimensions & Question Types */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Core Competencies */}
            <section className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Core Competencies</h2>
                  <p className="text-xs text-muted">Performance across foundational rubrics</p>
                </div>
                <Award size={20} className="text-teal" />
              </div>

              <div className="space-y-4 pt-1">
                {Object.entries(DIM_META).map(([key, meta]) => (
                  <div key={key} className="space-y-1">
                    <ScoreBar label={meta.label} value={data.by_dimension[key] ?? 0} />
                    <p className="text-[11px] text-muted pl-1">{meta.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Performance by Question Type */}
            <section className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Question Type Breakdown</h2>
                  <p className="text-xs text-muted">Averaged scores across interview formats</p>
                </div>
                <Target size={20} className="text-teal" />
              </div>

              <div className="space-y-4 pt-1">
                {Object.entries(data.by_type).map(([key, val]) => {
                  const meta = TYPE_META[key] || { label: key, icon: "📋" };
                  return (
                    <div key={key} className="space-y-1">
                      <ScoreBar label={`${meta.icon} ${meta.label}`} value={val} />
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Actionable Topic Recommendations (Weak vs Strong) */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Weak Topics to Practice */}
            <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                  <AlertTriangle size={18} />
                  <h2 className="font-display text-lg">Focus Areas to Strengthen</h2>
                </div>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Avg &lt; 3.0
                </span>
              </div>

              {data.weak_topics?.length ? (
                <div className="space-y-2.5">
                  {data.weak_topics.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-surface p-3.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{t.topic}</p>
                        <span className="text-xs text-muted">
                          {t.count} answer{t.count === 1 ? "" : "s"} evaluated
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-display text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {t.avg.toFixed(1)} / 5
                        </span>
                        <Link
                          to="/new"
                          className="flex items-center gap-1 rounded-xl bg-teal px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-dark transition-colors"
                        >
                          <span>Practice</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                  <p>All evaluated topics currently average 3.0 or higher. Excellent consistency!</p>
                </div>
              )}
            </section>

            {/* Strongest Topics */}
            <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                  <CheckCircle2 size={18} />
                  <h2 className="font-display text-lg">Top Mastered Domains</h2>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Avg &ge; 4.0
                </span>
              </div>

              {data.strong_topics?.length ? (
                <div className="space-y-2.5">
                  {data.strong_topics.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-surface p-3.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{t.topic}</p>
                        <span className="text-xs text-muted">
                          {t.count} answer{t.count === 1 ? "" : "s"} evaluated
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {t.avg.toFixed(1)} / 5
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted">
                  <p>Keep practicing to elevate your topic scores past the 4.0 mastery benchmark.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
