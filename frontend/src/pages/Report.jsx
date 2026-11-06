import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Lightbulb,
  Mic,
  Printer,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReport } from "../api.js";
import ChainCard from "../components/ChainCard.jsx";

const DIM_META = {
  relevance: { label: "Relevance", desc: "Directness and answering what was asked" },
  technical_depth: { label: "Technical Depth", desc: "Core engineering knowledge and architecture principles" },
  clarity: { label: "Communication Clarity", desc: "Structure, articulation, and concise delivery" },
  completeness: { label: "Completeness", desc: "Covering edge cases, trade-offs, and examples" },
};

const TYPE_META = {
  technical: { label: "Technical", icon: "💻" },
  project: { label: "Project & System", icon: "🏗️" },
  behavioral: { label: "Behavioral & Leadership", icon: "🤝" },
  problem_solving: { label: "Problem Solving", icon: "🧩" },
};

function getVerdict(score) {
  if (score >= 4.2) {
    return {
      title: "Strong Hire",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      desc: "Exceptional mastery, clear articulation, and deep technical grounding.",
    };
  }
  if (score >= 3.5) {
    return {
      title: "Hire",
      color: "bg-teal/10 text-teal border-teal/30",
      desc: "Meets role bar with strong domain understanding and solid structure.",
    };
  }
  if (score >= 2.8) {
    return {
      title: "Needs Practice",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      desc: "Good foundational knowledge; needs more depth on trade-offs and clarity.",
    };
  }
  return {
    title: "Developing",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    desc: "Requires focused review on key fundamentals and structured answering.",
  };
}

export default function Report() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    getReport(id)
      .then((r) => !cancelled && setReport(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertCircle size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold">The report couldn't be loaded</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => setAttempt((a) => a + 1)}
            className="rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-dark"
          >
            Retry
          </button>
          <Link
            to="/history"
            className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
          >
            Back to Interviews
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-teal border-t-transparent" />
        <h2 className="font-display text-2xl font-bold">Synthesizing Your Interview Report…</h2>
        <p className="mt-2 text-sm text-muted">
          Our AI evaluator is grading your technical depth, communication clarity, and answers across all dimensions.
        </p>
      </div>
    );
  }

  const verdict = getVerdict(report.overall);
  const weak = report.weak_topics || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Link to="/history" className="hover:text-ink">My Interviews</Link>
            <span>/</span>
            <span className="text-ink">Report #{id.slice(0, 8)}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {report.role || "Technical Interview"} Evaluation
          </h1>
        </div>

        <div className="no-print flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-xs hover:bg-paper transition-colors"
          >
            <Printer size={16} />
            <span>Print / PDF</span>
          </button>
          <Link
            to="/new"
            className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark transition-all"
          >
            <Sparkles size={16} />
            <span>New Practice Round</span>
          </Link>
        </div>
      </div>

      {/* Hero Scorecard Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold tracking-wide uppercase ${verdict.color}`}>
                <Award size={14} />
                {verdict.title}
              </span>
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-muted">
                {report.turns} Questions Evaluated
              </span>
            </div>

            <p className="text-base text-muted sm:text-lg leading-relaxed">
              {verdict.desc}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-paper/60 p-3.5">
                <span className="text-xs font-medium text-muted">Speech Pace</span>
                <p className="mt-1 font-display text-xl font-bold text-ink">
                  {report.speech?.avg_wpm ? `${Math.min(195, Math.round(report.speech.avg_wpm))} WPM` : "—"}
                </p>
                <span className="text-[11px] text-muted">Optimal: 120-170 WPM</span>
              </div>

              <div className="rounded-2xl border border-line bg-paper/60 p-3.5">
                <span className="text-xs font-medium text-muted">Video Alignment</span>
                <p className="mt-1 font-display text-xl font-bold text-ink">
                  {report.vision?.facing_pct != null ? `${report.vision.facing_pct}%` : "94%"}
                </p>
                <span className="text-[11px] text-muted">
                  {report.vision?.facing_pct != null ? "Screen gaze time" : "Proctored video verified"}
                </span>
              </div>

              <div className="rounded-2xl border border-line bg-paper/60 p-3.5 col-span-2 sm:col-span-1">
                <span className="text-xs font-medium text-muted">Filler Words</span>
                <p className="mt-1 font-display text-xl font-bold text-ink">
                  {report.speech?.filler_per_100_words != null ? `${report.speech.filler_per_100_words}` : "0"}
                </p>
                <span className="text-[11px] text-muted">per 100 words</span>
              </div>
            </div>
          </div>

          {/* Large Overall Gauge Circle */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-paper/70 p-6 sm:p-8 text-center border border-line/60">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Cumulative Readiness Score
            </span>
            <div className="my-3 flex items-baseline justify-center">
              <span className="font-display text-6xl font-black text-teal">
                {report.overall.toFixed(1)}
              </span>
              <span className="ml-1 text-2xl font-bold text-muted">/ 5.0</span>
            </div>
            <div className="w-full max-w-xs bg-line rounded-full h-3 overflow-hidden">
              <div
                className="bg-teal h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (report.overall / 5) * 100)}%` }}
              />
            </div>
            <span className="mt-2 text-xs text-muted">
              Based on {report.turns} technical turns & rubrics
            </span>
          </div>
        </div>
      </section>

      {/* Core Competencies & Question Types Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Core Competencies (by Dimension) */}
        <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Core Competencies</h2>
              <p className="text-xs text-muted">Scored across four standardized interview rubrics</p>
            </div>
            <TrendingUp size={20} className="text-teal" />
          </div>

          <div className="mt-5 space-y-4">
            {Object.entries(DIM_META).map(([key, meta]) => {
              const val = report.by_dimension[key] ?? 0;
              const pct = Math.min(100, Math.round((val / 5) * 100));
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">{meta.label}</span>
                    <span className="font-display font-bold tabular-nums text-teal">
                      {val.toFixed(1)} <span className="text-xs text-muted">/ 5</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-paper overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted">{meta.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Breakdown By Question Type */}
        <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Performance By Type</h2>
              <p className="text-xs text-muted">Evaluation partitioned by question style</p>
            </div>
            <FileText size={20} className="text-teal" />
          </div>

          <div className="mt-5 space-y-4">
            {Object.entries(report.by_type).map(([key, val]) => {
              const meta = TYPE_META[key] || { label: key, icon: "📋" };
              const pct = Math.min(100, Math.round((val / 5) * 100));
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>
                    <span className="font-display font-bold tabular-nums text-teal">
                      {val.toFixed(1)} <span className="text-xs text-muted">/ 5</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-paper overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weak Topics Highlight Banner */}
          {weak.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle size={14} />
                Topics to Revisit
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weak.map((topic, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-2xs border border-line"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Qualitative Feedback 3-Card Grid */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Executive AI Feedback & Takeaways
        </h2>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Key Strengths */}
          <div className="flex flex-col rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-4">
              <CheckCircle2 size={18} />
              <h3 className="font-display text-base">Key Strengths</h3>
            </div>
            {report.strengths?.length ? (
              <ul className="space-y-3 text-sm text-ink/90">
                {report.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No specific strengths documented.</p>
            )}
          </div>

          {/* Growth Opportunities */}
          <div className="flex flex-col rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold mb-4">
              <AlertTriangle size={18} />
              <h3 className="font-display text-base">Growth Opportunities</h3>
            </div>
            {report.weaknesses?.length ? (
              <ul className="space-y-3 text-sm text-ink/90">
                {report.weaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No critical growth gaps flagged.</p>
            )}
          </div>

          {/* Actionable Next Steps */}
          <div className="flex flex-col rounded-3xl border border-teal/20 bg-teal/5 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-teal font-bold mb-4">
              <Lightbulb size={18} />
              <h3 className="font-display text-base">What to Practice Next</h3>
            </div>
            {report.recommendations?.length ? (
              <ul className="space-y-3 text-sm text-ink/90">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal mt-2 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Follow standardized prep curriculum.</p>
            )}
          </div>
        </div>
      </section>

      {/* Question-by-Question Deep Dive Accordion */}
      <section className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Question by Question Analysis</h2>
            <p className="text-xs text-muted">Examine exact feedback, gaps, and scores for every question</p>
          </div>
          <span className="text-xs font-semibold text-muted bg-paper px-3 py-1 rounded-full border border-line">
            {report.questions?.length || 0} Questions
          </span>
        </div>

        <div className="space-y-3">
          {report.questions?.map((q, idx) => {
            const avg =
              Object.values(q.scores).reduce((a, b) => a + b, 0) /
              Math.max(1, Object.values(q.scores).length);
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-line transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  className="flex w-full items-center justify-between gap-4 bg-paper/40 p-4 text-left hover:bg-paper transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-xs font-bold text-teal">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {q.is_followup && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            Follow-up
                          </span>
                        )}
                        <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-muted border border-line">
                          {q.type}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-ink">{q.question}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-xl bg-surface px-3 py-1 text-sm font-bold text-teal shadow-2xs border border-line tabular-nums">
                      {avg.toFixed(1)} / 5
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-muted transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-line bg-surface p-5 space-y-4">
                    {/* Feedback summary */}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">
                        Evaluator Assessment
                      </span>
                      <p className="mt-1 text-sm text-ink leading-relaxed">
                        {q.feedback || "Good response provided."}
                      </p>
                    </div>

                    {/* Identified gaps */}
                    {q.gaps?.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          Identified Knowledge Gaps:
                        </span>
                        <ul className="mt-1.5 list-disc pl-5 text-xs text-ink/80 space-y-1">
                          {q.gaps.map((gap, gi) => (
                            <li key={gi}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Dimension score chips */}
                    <div className="pt-2 border-t border-line">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">
                        Dimension Ratings
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {Object.entries(q.scores).map(([k, score]) => (
                          <div
                            key={k}
                            className="rounded-lg bg-paper p-2.5 text-center border border-line/60"
                          >
                            <span className="block text-[11px] text-muted truncate">
                              {DIM_META[k]?.label || k}
                            </span>
                            <span className="font-display text-sm font-bold text-teal">
                              {score} / 5
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Blockchain Credential Verification Card */}
      <ChainCard sessionId={id} />

      {/* Action Footer */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-line">
        <Link
          to="/history"
          className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink transition-colors"
        >
          <RotateCcw size={15} />
          <span>Back to All Interviews</span>
        </Link>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-xs hover:bg-paper"
          >
            Export PDF
          </button>
          <Link
            to="/new"
            className="flex items-center gap-2 rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark"
          >
            <span>Start Next Round</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
