import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReport } from "../api.js";
import ScoreBar from "../components/ScoreBar.jsx";

const DIM_LABELS = {
  relevance: "Relevance",
  technical_depth: "Technical depth",
  clarity: "Clarity",
  completeness: "Completeness",
};
const TYPE_LABELS = {
  technical: "Technical",
  project: "Project",
  behavioral: "Behavioral",
  problem_solving: "Problem solving",
};

function List({ title, items }) {
  return (
    <section>
      <h3 className="font-serif text-xl font-semibold">{title}</h3>
      {items?.length ? (
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          {items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-muted">Nothing to report.</p>
      )}
    </section>
  );
}

export default function Report() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    getReport(id)
      .then((r) => !cancelled && setReport(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [id, attempt]);

  if (error) {
    return (
      <div className="max-w-xl">
        <h1 className="font-serif text-3xl font-semibold">The report didn't load</h1>
        <p role="alert" className="mt-2 text-danger">{error}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={() => setAttempt((a) => a + 1)} className="rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark">
            Try again
          </button>
          <Link to="/" className="rounded-md border border-line bg-surface px-5 py-2.5 font-medium">New interview</Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return <p role="status" className="text-muted">Writing your report. This can take up to 30 seconds.</p>;
  }

  const weak = report.weak_topics || [];

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-serif text-4xl font-semibold leading-tight">
          Interview report{report.role ? `: ${report.role}` : ""}
        </h1>
        <p className="mt-2 text-lg">
          Overall <span className="font-semibold tabular-nums">{report.overall.toFixed(1)}</span> out of 5, across {report.turns} answers.
        </p>
        <p className="mt-1 text-sm text-muted">
          Scores come from an AI model and are a practice guide, not a hiring verdict. Treat the written feedback as more useful than the numbers.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">What the answers showed</h2>
        {Object.entries(DIM_LABELS).map(([k, label]) => (
          <ScoreBar key={k} label={label} value={report.by_dimension[k] ?? 0} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">By question type</h2>
        {Object.entries(report.by_type).map(([k, v]) => (
          <ScoreBar key={k} label={TYPE_LABELS[k] || k} value={v} />
        ))}
      </section>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Topics to revisit</h2>
        {weak.length ? (
          <p className="mt-2">{weak.join(", ")}</p>
        ) : (
          <p className="mt-2 text-muted">No topic averaged below 3.0.</p>
        )}
      </section>

      <div className="grid gap-8 sm:grid-cols-3">
        <List title="Strengths" items={report.strengths} />
        <List title="Weaknesses" items={report.weaknesses} />
        <List title="What to practice" items={report.recommendations} />
      </div>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Question by question</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {report.questions.map((q, i) => {
            const avg = Object.values(q.scores).reduce((a, b) => a + b, 0) / Object.values(q.scores).length;
            return (
              <details key={i} className="group py-3">
                <summary className="flex cursor-pointer items-baseline justify-between gap-4">
                  <span>
                    {q.is_followup && <span className="mr-2 rounded-full border border-gold px-2 py-0.5 text-xs">Follow-up</span>}
                    {q.question}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">{avg.toFixed(1)}</span>
                </summary>
                <div className="mt-3 space-y-2 pl-1">
                  <p>{q.feedback || "No feedback recorded."}</p>
                  {q.gaps?.length > 0 && (
                    <p className="text-muted">Missing: {q.gaps.join("; ")}</p>
                  )}
                  <p className="text-sm text-muted">
                    {Object.entries(q.scores).map(([k, v]) => `${DIM_LABELS[k] || k} ${v}`).join(", ")}
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <div className="no-print flex gap-3">
        <button onClick={() => window.print()} className="rounded-md border border-line bg-surface px-5 py-2.5 font-medium">
          Print or save as PDF
        </button>
        <Link to="/" className="rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark">
          Start a new interview
        </Link>
      </div>
    </div>
  );
}
