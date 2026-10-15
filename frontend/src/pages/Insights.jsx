import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInsights } from "../api.js";
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

function TopicList({ title, items, empty }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      {items.length ? (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {items.map((t) => (
            <li key={t.topic} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate">{t.topic}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {t.avg.toFixed(1)} / 5 · {t.count} answer{t.count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted">{empty}</p>
      )}
    </section>
  );
}

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
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold leading-tight">Skill insights</h1>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
          {error}
        </p>
      )}
      {!data && !error && <p role="status" className="text-muted">Loading…</p>}

      {data && data.interviews === 0 && (
        <p className="text-muted">
          Insights appear after you finish an interview.{" "}
          <Link to="/new" className="font-medium text-teal underline">Start one</Link>.
        </p>
      )}

      {data && data.interviews > 0 && (
        <>
          <p className="text-sm text-muted">
            Based on {data.interviews} completed interview{data.interviews === 1 ? "" : "s"} and {data.answers} answers.
            With only a few interviews, treat these as rough pointers.
          </p>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">Across all answers</h2>
            {Object.entries(DIM_LABELS).map(([k, label]) => (
              <ScoreBar key={k} label={label} value={data.by_dimension[k] ?? 0} />
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">By question type</h2>
            {Object.entries(data.by_type).map(([k, v]) => (
              <ScoreBar key={k} label={TYPE_LABELS[k] || k} value={v} />
            ))}
          </section>

          <TopicList title="Topics to practice" items={data.weak_topics} empty="No topic averages below 3.0." />
          <TopicList title="Strongest topics" items={data.strong_topics} empty="No topic averages 4.0 or higher yet." />

          {data.speech && (
            <section>
              <h2 className="text-2xl font-semibold">Speaking</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                {data.speech.avg_wpm != null && <li>Average pace: {data.speech.avg_wpm} words per minute.</li>}
                <li>Filler words: {data.speech.filler_per_100_words} per 100 words.</li>
              </ul>
              <p className="mt-2 text-sm text-muted">
                From {data.speech.interviews} interview{data.speech.interviews === 1 ? "" : "s"} with spoken answers.
                Approximate: browser speech recognition often drops "um" and "uh".
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}