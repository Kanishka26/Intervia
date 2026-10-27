import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobMatches } from "../api.js";
import JobMap from "../components/JobMap.jsx";

const LIMIT = 12;
const selectCls = "rounded-md border border-line bg-surface px-3 py-2 text-base";

function SkillChips({ job }) {
  const matched = new Set(job.matched);
  const practise = new Set(job.practise);
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {job.skills.map((s) => {
        const have = matched.has(s);
        const weak = practise.has(s);
        return (
          <li
            key={s}
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              have ? "bg-soft text-teal" : "border border-line text-muted"
            } ${weak ? "border border-gold" : ""}`}
          >
            {have ? "✓ " : ""}
            {s}
            {weak ? " · practise" : ""}
          </li>
        );
      })}
    </ul>
  );
}

export default function Jobs() {
  const [city, setCity] = useState("");
  const [data, setData] = useState(null);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [showHeat, setShowHeat] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getJobMatches(city)
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setCities(r.cities);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city]);

  const jobs = (data?.jobs || []).filter((j) => j.score >= minScore);
  const visible = showAll ? jobs : jobs.slice(0, LIMIT);
  const origin = cities.find((c) => c.name === city) || null;

  useEffect(() => {
    if (selected) document.getElementById(`job-${selected}`)?.scrollIntoView({ block: "nearest" });
  }, [selected, showAll]);

  function pick(id) {
    if (!visible.some((j) => j.id === id)) setShowAll(true);
    setSelected(id);
  }

  if (error && !data) {
    return (
      <div>
        <h1 className="text-3xl font-semibold leading-tight">Jobs map</h1>
        <p role="alert" className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
          {error}
        </p>
      </div>
    );
  }
  if (!data) return <p role="status" className="text-muted">Loading…</p>;

  const { skills, average } = data.candidate;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold leading-tight">Jobs map</h1>
        <p className="mt-2 text-muted">
          Sample listings ranked by how well they fit your skills, your location and your interview scores.
          These are demo jobs, not real openings.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
          {error}
        </p>
      )}

      {skills.length === 0 ? (
        <p className="rounded-md border border-gold bg-surface px-3 py-2 text-sm">
          No skills found yet, so scores will be low.{" "}
          <Link to="/profile" className="font-medium text-teal underline">Add skills on your profile</Link> or
          finish an interview so they can be read from your resume.
        </p>
      ) : (
        <div className="text-sm">
          <p className="text-muted">
            Matching on {skills.length} skill{skills.length === 1 ? "" : "s"}:{" "}
            <span className="text-ink">{skills.slice(0, 12).join(", ")}{skills.length > 12 ? "…" : ""}</span>.{" "}
            <Link to="/profile" className="font-medium text-teal underline">Edit skills</Link>
          </p>
          {average == null && (
            <p className="mt-1 text-muted">Finish an interview to include your interview score in the match.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium">Preferred city</label>
          <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className={selectCls}>
            <option value="">Anywhere</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="min" className="block text-sm font-medium">Minimum match</label>
          <select id="min" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className={selectCls}>
            <option value={0}>Any</option>
            <option value={30}>30% or more</option>
            <option value={50}>50% or more</option>
            <option value={70}>70% or more</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
          Heatmap
        </label>
        {loading && <span role="status" className="pb-2 text-sm text-muted">Updating…</span>}
      </div>

      <JobMap jobs={jobs} selectedId={selected} onSelect={pick} showHeat={showHeat} origin={origin} />

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-teal" />70% or more</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-gold" />40 to 69%</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-muted" />under 40%</span>
        {origin && <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-ink" />{origin.name}</span>}
        <span>Hotter areas have more good matches. Use the + and − buttons to zoom.</span>
      </p>

      <section>
        <h2 className="text-2xl font-semibold">Best matches</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 text-muted">No jobs reach that match level. Try a lower minimum.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {visible.map((j) => (
              <li key={j.id}>
                <button
                  id={`job-${j.id}`}
                  type="button"
                  onClick={() => pick(j.id)}
                  aria-pressed={selected === j.id}
                  className={`w-full rounded-xl border p-4 text-left hover:bg-paper ${
                    selected === j.id ? "border-teal bg-paper" : "border-line bg-surface"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold">{j.title}</span>
                      <span className="block text-sm text-muted">
                        {j.company} · {j.city} · {j.level}
                        {j.distance_km != null ? ` · ${j.distance_km.toLocaleString()} km away` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-soft px-3 py-1 text-sm font-semibold tabular-nums text-teal">
                      {j.score}% match
                    </span>
                  </span>
                  <SkillChips job={j} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {jobs.length > LIMIT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="mt-4 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium"
          >
            {showAll ? "Show fewer" : `Show all ${jobs.length}`}
          </button>
        )}
        <p className="mt-4 text-xs text-muted">
          ✓ means you have the skill. "practise" marks a skill you scored below 3.0 on in your interviews.
          Score = 70% skill overlap, 15% distance, 15% interview score.
        </p>
      </section>
    </div>
  );
}