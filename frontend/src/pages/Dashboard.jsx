import { Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInsights } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import ScoreBar from "../components/ScoreBar.jsx";
import ScoreRing from "../components/ScoreRing.jsx";
import TrendChart from "../components/TrendChart.jsx";
import { streakDays } from "../streak.js";

const DIM_LABELS = {
  relevance: "Relevance",
  technical_depth: "Technical depth",
  clarity: "Clarity",
  completeness: "Completeness",
};

const when = (t) => new Date(t * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const card = "rounded-2xl border border-line bg-surface p-6";
const btnPrimary = "inline-flex items-center justify-center rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark";

function Skeleton({ className }) {
  return <div className={`rounded-2xl bg-line/60 motion-safe:animate-pulse ${className}`} />;
}

export default function Dashboard() {
  const { user } = useAuth();
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

  const first = (user?.displayName || "").split(" ")[0];
  const hasData = data && data.interviews > 0;
  const last = hasData ? data.trend[data.trend.length - 1] : null;
  const focus = hasData ? data.weak_topics?.[0] : null;
  const streak = hasData ? streakDays(data.trend) : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting()}{first ? `, ${first}` : ""}
          </h1>
          <p className="mt-1 text-muted">
            {hasData
              ? `You have finished ${data.interviews} interview${data.interviews === 1 ? "" : "s"} so far.`
              : data
                ? "Run your first interview and your progress will build up here."
                : "Loading your progress…"}
          </p>
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium">
            <Flame size={16} className="text-gold" aria-hidden="true" />
            {streak}-day streak
          </span>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">{error}</p>
      )}

      <section className={`grid gap-4 ${hasData ? "lg:grid-cols-[1.6fr_1fr]" : ""}`}>
        <div className="rounded-3xl bg-stage p-7 text-white sm:p-9">
          <div className="flex items-center justify-between gap-6">
            <div className="max-w-md">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {hasData ? "Ready for the next round?" : "Ready for your first round?"}
              </h2>
              <p className="mt-2 text-white/75">
                {focus
                  ? `Your weakest topic so far is ${focus.topic}, averaging ${focus.avg.toFixed(1)} out of 5. Pick a job that needs it and practice.`
                  : "Paste a job description and your resume. The interviewer takes it from there."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/new" className={btnPrimary}>Start an interview</Link>
                {last && (
                  <Link to={`/report/${last.id}`} className="inline-flex items-center justify-center rounded-md border border-white/25 px-5 py-2.5 font-medium hover:bg-white/10">
                    Review last report
                  </Link>
                )}
              </div>
            </div>
            <div className="hidden shrink-0 flex-col items-center sm:flex" aria-hidden="true">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal text-2xl font-semibold">AI</div>
              <div className="mt-3 flex h-5 items-end gap-1">
                {[0.4, 0.8, 0.55, 1, 0.5].map((h, i) => (
                  <span key={i} className="w-1 rounded-full bg-white/70" style={{ height: `${h * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {hasData && (
          <div className={`${card} flex items-center gap-6`}>
            <ScoreRing value={data.average} />
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted">Interviews finished</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums">{data.interviews}</dd>
              </div>
              <div>
                <dt className="text-muted">Answers scored</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums">{data.answers}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {!data && !error && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      )}

      {hasData && (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className={card}>
              <h2 className="font-display text-xl font-bold tracking-tight">Score over time</h2>
              <div className="mt-4">
                {data.trend.length >= 2 ? (
                  <TrendChart data={data.trend} />
                ) : (
                  <p className="text-muted">Finish one more interview to see a trend.</p>
                )}
              </div>
            </div>
            <div className={card}>
              <h2 className="font-display text-xl font-bold tracking-tight">Where you stand</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(DIM_LABELS).map(([k, label]) => (
                  <ScoreBar key={k} label={label} value={data.by_dimension?.[k] ?? 0} />
                ))}
              </div>
              {data.weak_topics?.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold">Topics to practice</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {data.weak_topics.slice(0, 4).map((t) => (
                      <li key={t.topic} className="rounded-full border border-gold px-3 py-1 text-sm">{t.topic}</li>
                    ))}
                  </ul>
                </>
              )}
              <Link to="/insights" className="mt-5 inline-block text-sm font-medium text-teal underline">See all skill insights</Link>
            </div>
          </section>

          <section className={card}>
            <h2 className="font-display text-xl font-bold tracking-tight">Latest interviews</h2>
            <ul className="mt-3 divide-y divide-line">
              {[...data.trend].reverse().slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.role || "Interview"}</p>
                    <p className="text-sm text-muted">{when(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full border px-3 py-0.5 text-sm tabular-nums ${r.overall < 3 ? "border-gold" : "border-line"}`}>
                      {r.overall.toFixed(1)} / 5
                    </span>
                    <Link to={`/report/${r.id}`} className="text-sm font-medium text-teal underline">Report</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}