import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInsights } from "../api.js";
import TrendChart from "../components/TrendChart.jsx";

const when = (t) => new Date(t * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });

export default function Dashboard() {
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
      <h1 className="text-3xl font-semibold leading-tight">Dashboard</h1>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
          {error}
        </p>
      )}
      {!data && !error && <p role="status" className="text-muted">Loading…</p>}

      {data && data.interviews === 0 && (
        <div>
          <p className="text-muted">
            Your progress shows up here once you finish an interview and open its report.
          </p>
          <Link to="/new" className="mt-4 inline-block rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark">
            Start an interview
          </Link>
        </div>
      )}

      {data && data.interviews > 0 && (
        <>
          <p className="text-lg">
            {data.interviews} completed interview{data.interviews === 1 ? "" : "s"}, {data.answers} answers, average{" "}
            <span className="font-semibold tabular-nums">{data.average.toFixed(1)}</span> out of 5.
          </p>

          <section>
            <h2 className="text-2xl font-semibold">Score over time</h2>
            <div className="mt-3">
              {data.trend.length >= 2 ? (
                <TrendChart data={data.trend} />
              ) : (
                <p className="text-muted">Finish one more interview to see a trend.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Latest interviews</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {[...data.trend].reverse().slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 truncate">
                    {r.role || "Interview"} <span className="text-muted">· {when(r.created_at)}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="tabular-nums">{r.overall.toFixed(1)} / 5</span>
                    <Link to={`/report/${r.id}`} className="font-medium text-teal underline">Report</Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Link to="/new" className="inline-block rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark">
            Start an interview
          </Link>
        </>
      )}
    </div>
  );
}