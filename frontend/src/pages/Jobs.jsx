import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Copy,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  Layers,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJobMatches, postEmployerJob } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import JobMap from "../components/JobMap.jsx";

const LIMIT = 12;

function SkillChips({ job }) {
  const matched = new Set(job.matched || []);
  const practise = new Set(job.practise || []);

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {job.skills?.map((s) => {
        const have = matched.has(s);
        const weak = practise.has(s);

        if (have) {
          return (
            <li
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <Check size={11} />
              <span>{s}</span>
            </li>
          );
        }

        if (weak) {
          return (
            <li
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400"
            >
              <span>{s}</span>
              <span className="text-[10px] font-normal opacity-75">(practise)</span>
            </li>
          );
        }

        return (
          <li
            key={s}
            className="rounded-full bg-paper border border-line px-2.5 py-0.5 text-xs font-medium text-muted"
          >
            {s}
          </li>
        );
      })}
    </ul>
  );
}

export default function Jobs() {
  const navigate = useNavigate();
  const { isEmployer, companyName } = useAuth();
  const [city, setCity] = useState("");
  const [data, setData] = useState(null);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [maxRadius, setMaxRadius] = useState(0); // 0 = all
  const [selectedCorridor, setSelectedCorridor] = useState("");
  const [onlyLive, setOnlyLive] = useState(false);
  const [filterMyCompany, setFilterMyCompany] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);

  // Recruiter Post Job Modal state
  const [showPostJob, setShowPostJob] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    company: companyName || "Acme Corp",
    city: "Bengaluru",
    level: "Mid",
    skills: "Python, FastAPI, React, Docker",
    location_type: "Hybrid / In-Office",
    description: "Looking for an energetic engineer to build scalable software solutions.",
  });
  const [postingJob, setPostingJob] = useState(false);
  const [postSuccess, setPostSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getJobMatches(city)
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setCities(r.cities || []);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [city]);

  async function refreshLive() {
    setRefreshing(true);
    setError("");
    try {
      const res = await getJobMatches(city, true);
      setData(res);
      setCities(res.cities || []);
    } catch (err) {
      setError(err.message || "Failed to refresh live jobs");
    } finally {
      setRefreshing(false);
    }
  }

  // Clone competitor requisition for employer benchmarking
  function handleCloneRequisition(j, e) {
    e.stopPropagation();
    setNewJob({
      title: j.title,
      company: companyName || "Acme Corp",
      city: j.city || "Bengaluru",
      level: j.level || "Mid",
      skills: Array.isArray(j.skills) ? j.skills.join(", ") : "Python, React",
      location_type: j.location_type || "Hybrid / In-Office",
      description: `Competing requisition modeled after industry standard ${j.title} opening at ${j.company} (${j.city}).`,
    });
    setShowPostJob(true);
  }

  async function handlePostJobSubmit(e) {
    e.preventDefault();
    if (postingJob) return;
    setPostingJob(true);
    setError("");

    try {
      const skillsArray = newJob.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: newJob.title.trim(),
        company: newJob.company.trim(),
        city: newJob.city.trim(),
        level: newJob.level,
        skills: skillsArray,
        location_type: newJob.location_type,
        description: newJob.description.trim(),
      };

      const res = await postEmployerJob(payload);
      if (res.ok && res.job) {
        setPostSuccess(`Opening "${res.job.title}" successfully posted & mapped to GIS radar!`);
        setShowPostJob(false);
        // Prepend new job to local state
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            jobs: [res.job, ...(prev.jobs || [])],
          };
        });
        setSelected(res.job.id);
        setTimeout(() => setPostSuccess(""), 5000);
      }
    } catch (err) {
      setError(err.message || "Failed to post job");
    } finally {
      setPostingJob(false);
    }
  }

  const jobs = (data?.jobs || []).filter((j) => {
    if (!isEmployer && j.score < minScore) return false;
    if (onlyLive && !j.is_live) return false;
    if (filterMyCompany && !(j.is_employer || j.company?.toLowerCase() === (companyName || "acme").toLowerCase())) {
      return false;
    }
    if (maxRadius > 0 && j.distance_km != null && j.distance_km > maxRadius) return false;
    if (selectedCorridor && j.corridor !== selectedCorridor) return false;
    return true;
  });

  const visible = showAll ? jobs : jobs.slice(0, LIMIT);
  const origin = cities.find((c) => c.name === city) || null;
  const originGis = data?.gis?.origin || null;

  useEffect(() => {
    if (selected) {
      document.getElementById(`job-${selected}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selected, showAll]);

  function pick(id) {
    if (!visible.some((j) => j.id === id)) setShowAll(true);
    setSelected(id);
  }

  // Quick 1-click practice for this role (Candidate Only)
  function practiceForJob(j, e) {
    e.stopPropagation();
    const generatedJd = `${j.title} at ${j.company} (${j.city})\nLevel: ${j.level}\nRequired Skills: ${j.skills.join(", ")}\nResponsibilities: Build high-performance software, architect scalable solutions, collaborate with cross-functional engineering teams, and deliver robust software systems.`;
    navigate("/new", {
      state: {
        presetRole: j.title,
        presetJd: generatedJd,
      },
    });
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertCircle size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold">Failed to load jobs</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-muted">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-teal border-t-transparent" />
        <p className="text-sm">Activating GIS spatial engine &amp; analyzing tech market…</p>
      </div>
    );
  }

  const { skills, average } = data.candidate || { skills: [], average: null };
  const corridorsList = data?.gis?.tech_corridors || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Success Notification */}
      {postSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/10 px-4 py-3 text-sm font-medium text-teal shadow-xs">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{postSuccess}</span>
        </div>
      )}

      {/* Header Banner - Dual Mode: Employer Intelligence vs Candidate Radar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
              {isEmployer ? "Hiring Market Intelligence & Spatial Radar" : "GIS Job Market Radar"}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                isEmployer
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "bg-teal/10 text-teal border border-teal/20"
              }`}
            >
              {isEmployer ? "Recruiter Market Intelligence" : "Spatial Intelligence"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {isEmployer
              ? "Real-time competitor hiring volume, regional tech corridors, and spatial talent supply density across India."
              : "Geodesic spatial indexing, commute isochrone buffer zones, and ML compatibility models matching your tech profile."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isEmployer ? (
            <>
              <button
                type="button"
                onClick={() => setShowPostJob(true)}
                className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Post Opening in a Corridor</span>
              </button>
              <Link
                to="/employer"
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-ink shadow-xs hover:bg-paper transition-colors"
              >
                <Users size={15} className="text-teal" />
                <span>Talent Pipeline</span>
              </Link>
            </>
          ) : (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink shadow-xs hover:bg-paper transition-colors"
            >
              <Target size={14} className="text-teal" />
              <span>Update My Profile Skills</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RECRUITER MARKET INTELLIGENCE STRIP (EMPLOYER) VS SKILLS STRIP (CANDIDATE) */}
      {isEmployer ? (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
              <Briefcase size={18} />
            </div>
            <div>
              <div className="text-xs text-muted font-medium">Market Openings</div>
              <div className="font-display text-base font-black text-ink">{jobs.length} Active Positions</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-xs text-muted font-medium">Live API Roles</div>
              <div className="font-display text-base font-black text-ink">{data?.live_count || 167} Ingested</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <MapPin size={18} />
            </div>
            <div>
              <div className="text-xs text-muted font-medium">Tech Hubs Mapped</div>
              <div className="font-display text-base font-black text-ink">16 Metros &amp; Corridors</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-xs text-muted font-medium">High Scarcity Stack</div>
              <div className="text-xs font-bold text-ink truncate">React, Python, AWS, Docker</div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          {skills.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                <AlertCircle size={17} />
                <span>No skills detected in your profile or previous resume.</span>
              </div>
              <Link to="/profile" className="text-xs font-bold text-teal underline">
                Add skills on your profile &rarr;
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink">Matching on {skills.length} skills:</span>
                <div className="flex flex-wrap gap-1">
                  {skills.slice(0, 10).map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-paper px-2 py-0.5 font-medium text-ink border border-line/60"
                    >
                      {s}
                    </span>
                  ))}
                  {skills.length > 10 && (
                    <span className="text-muted self-center">+{skills.length - 10} more</span>
                  )}
                </div>
              </div>

              {average != null ? (
                <span className="rounded-lg bg-teal/10 px-2.5 py-1 font-bold text-teal">
                  Interview score weighted: {average.toFixed(1)} / 5
                </span>
              ) : (
                <span className="text-muted">
                  Complete an interview to calibrate your score.
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* GIS Spatial Summary Bar (Active when a Hub is selected) */}
      {origin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-teal/20 bg-teal/5 p-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/15 text-teal shrink-0">
              <Navigation size={18} />
            </div>
            <div>
              <div className="font-bold text-ink">
                {isEmployer ? `Recruiter Hub Anchor: ${origin.name}` : `Candidate Spatial Hub: ${origin.name}`}
              </div>
              <div className="text-muted font-mono text-[11px]">
                Geohash: <strong className="text-teal">{originGis?.geohash || "N/A"}</strong> · ({origin.lat}, {origin.lng})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <div className="font-bold text-ink">
                {originGis?.corridor?.name || "Independent Metro Tech Hub"}
              </div>
              <div className="text-muted text-[11px]">
                {originGis?.corridor ? `${originGis.corridor.region} Regional Tech Belt` : "National Air / Highway Corridor"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <div className="font-bold text-ink">
                {jobs.filter((j) => j.distance_km != null && j.distance_km <= 35).length} Openings in Commute Buffer
              </div>
              <div className="text-muted text-[11px]">
                {isEmployer ? "Candidate talent catchment (≤ 35 km)" : "≤ 35 km (~30-55 min transit radius)"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIS Spatial Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Spatial Hub (City) selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5">
            <MapPin size={15} className="text-teal" />
            <select
              id="city-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-surface text-ink">Nationwide (All Hubs)</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name} className="bg-surface text-ink">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Commute / Isochrone Radius Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5">
            <Shield size={14} className="text-indigo-500" />
            <select
              id="radius-select"
              value={maxRadius}
              onChange={(e) => setMaxRadius(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-surface text-ink">Any Commute Radius</option>
              <option value={35} className="bg-surface text-ink">≤ 35 km (Daily Metro Commute)</option>
              <option value={85} className="bg-surface text-ink">≤ 85 km (Hybrid Satellite Ring)</option>
              <option value={280} className="bg-surface text-ink">≤ 280 km (Regional Tech Corridor)</option>
            </select>
          </div>

          {/* Tech Corridor Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5">
            <Zap size={14} className="text-amber-500" />
            <select
              id="corridor-select"
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-surface text-ink">All Tech Corridors</option>
              {corridorsList.map((corr) => (
                <option key={corr.id} value={corr.name} className="bg-surface text-ink">{corr.name}</option>
              ))}
            </select>
          </div>

          {/* Candidate-Only: Min score selector */}
          {!isEmployer && (
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5">
              <Filter size={14} className="text-teal" />
              <select
                id="min-score"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-surface text-ink">Any Match %</option>
                <option value={40} className="bg-surface text-ink">40%+ Fit</option>
                <option value={60} className="bg-surface text-ink">60%+ High Fit</option>
                <option value={75} className="bg-surface text-ink">75%+ Top Fit</option>
              </select>
            </div>
          )}

          {/* Recruiter-Only: Filter by My Company */}
          {isEmployer && (
            <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition-colors select-none">
              <input
                type="checkbox"
                checked={filterMyCompany}
                onChange={(e) => setFilterMyCompany(e.target.checked)}
                className="rounded text-teal focus:ring-teal"
              />
              <span>My Requisitions Only</span>
            </label>
          )}

          {/* Live Jobs Only toggle */}
          <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition-colors select-none">
            <span className={`h-2 w-2 rounded-full ${onlyLive ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
            <input
              type="checkbox"
              checked={onlyLive}
              onChange={(e) => setOnlyLive(e.target.checked)}
              className="rounded text-teal focus:ring-teal"
            />
            <span>Live Only ({data?.live_count || 0})</span>
          </label>

          {/* Sync Live Jobs Button */}
          <button
            type="button"
            onClick={refreshLive}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper hover:text-teal transition-colors disabled:opacity-50 cursor-pointer"
            title="Fetch real-time developer job postings from RemoteOK, Remotive, Arbeitnow, Jobicy"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-teal" : "text-muted"} />
            <span>{refreshing ? "Syncing..." : "Sync Live"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          {(loading || refreshing) && <span className="text-teal font-medium animate-pulse">Scanning GIS radar…</span>}
          <span>
            Showing <strong className="text-ink">{jobs.length}</strong> {isEmployer ? "requisitions" : "matching openings"}
          </span>
        </div>
      </div>

      {/* Interactive GIS Spatial Map Component */}
      <JobMap
        jobs={jobs}
        selectedId={selected}
        onSelect={pick}
        origin={origin ? { ...origin, geohash: originGis?.geohash, corridor: originGis?.corridor } : null}
        gisMeta={data?.gis}
        onSelectCity={(cityName) => setCity(cityName)}
      />

      {/* Job Listings / Market Intelligence Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              {isEmployer ? "Competitor Requisitions & Corridor Openings" : "Ranked Job Matches"}
            </h2>
            <p className="text-xs text-muted">
              {isEmployer
                ? "Real-time industry hiring demand. Benchmark required stacks, seniority, and corridor distributions against your open positions."
                : "Evaluated with dual-stream ML Job Compatibility Model + Haversine Geodesic Distance + Isochrone Buffer Physics."}
            </p>
          </div>

          <span className="text-xs font-semibold text-muted bg-paper px-3 py-1 rounded-full border border-line">
            {jobs.length} {isEmployer ? "Roles Scouted" : "Matching Roles"}
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface p-12 text-center text-muted">
            <Briefcase size={32} className="mx-auto text-muted mb-3" />
            <p className="font-semibold text-ink text-base">No openings match your current spatial filters.</p>
            <p className="text-xs mt-1">Try expanding the commute radius or clearing the tech corridor filter.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visible.map((j) => {
              const isSelected = selected === j.id;
              const isMyJob = j.is_employer || j.company?.toLowerCase() === (companyName || "acme corp").toLowerCase();
              const matchHigh = j.score >= 70;
              const matchMedium = j.score >= 40 && j.score < 70;

              return (
                <div
                  key={j.id}
                  id={`job-${j.id}`}
                  onClick={() => pick(j.id)}
                  className={`group relative cursor-pointer rounded-3xl border p-5 sm:p-6 transition-all duration-200 ${
                    isSelected
                      ? "border-teal bg-teal/5 shadow-md ring-1 ring-teal/30"
                      : isMyJob
                        ? "border-teal/40 bg-teal/5 hover:border-teal hover:shadow-xs"
                        : "border-line bg-surface hover:border-teal/30 hover:shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Role Title & Details */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-ink group-hover:text-teal transition-colors">
                          {j.title}
                        </h3>
                        <span className="rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line">
                          {j.level}
                        </span>
                        {isMyJob && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 border border-teal/30 px-2 py-0.5 text-[10px] font-bold text-teal">
                            <Briefcase size={10} />
                            Your Company Opening
                          </span>
                        )}
                        {j.is_live && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live ({j.source || "API"})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="flex items-center gap-1 font-medium text-ink">
                          <Building size={13} className="text-muted" />
                          {j.company}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {j.city}
                        </span>
                        {j.location_type && (
                          <>
                            <span>·</span>
                            <span className="text-[11px] text-teal font-medium">{j.location_type}</span>
                          </>
                        )}
                      </div>

                      {/* GIS Spatial Meta Badges */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                        {j.distance_km != null && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-paper px-2 py-0.5 font-medium text-ink border border-line">
                            <Navigation size={11} className="text-teal" />
                            <span>{j.distance_km} km</span>
                            {j.cardinal_dir && <span className="font-bold text-muted">({j.cardinal_dir})</span>}
                            {j.est_commute_min != null && <span className="text-muted">· ~{j.est_commute_min} min</span>}
                          </span>
                        )}

                        {j.gis_zone && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 font-semibold text-indigo-600 dark:text-indigo-400">
                            <Shield size={11} />
                            <span>{j.gis_zone}</span>
                          </span>
                        )}

                        {j.corridor && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-400">
                            <Zap size={11} />
                            <span>{j.corridor}</span>
                          </span>
                        )}

                        {j.geohash && (
                          <span className="font-mono text-[10px] text-muted opacity-80" title={`Geohash: ${j.geohash}`}>
                            #{j.geohash}
                          </span>
                        )}
                      </div>

                      <SkillChips job={j} />
                    </div>

                    {/* Action Column: Employer vs Candidate */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-line/60">
                      {/* For Candidate: Match % */}
                      {!isEmployer && (
                        <div className="text-left sm:text-right">
                          <div
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 font-display text-base font-black ${
                              matchHigh
                                ? "bg-teal/10 text-teal"
                                : matchMedium
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-paper text-muted"
                            }`}
                          >
                            <Zap size={14} />
                            <span>{j.score}% match</span>
                          </div>
                          {j.role_fit != null && (
                            <div className="mt-1 flex items-center justify-start sm:justify-end gap-1.5 text-[10px] text-muted">
                              <span className="font-medium text-ink/80">Role Fit: {j.role_fit}%</span>
                              <span>·</span>
                              <span className="font-medium text-ink/80">Skills: {j.skill_fit}%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* For Employer: Market Badge */}
                      {isEmployer && (
                        <div className="text-left sm:text-right">
                          <span className="inline-flex items-center gap-1 rounded-xl bg-paper px-3 py-1 text-xs font-bold text-muted border border-line">
                            {isMyJob ? "⭐ Active Posting" : "Competitor Role"}
                          </span>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex items-center gap-2">
                        {isEmployer ? (
                          <>
                            {isMyJob ? (
                              <Link
                                to="/employer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-teal px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all"
                              >
                                <Users size={13} />
                                <span>View Applicants</span>
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleCloneRequisition(j, e)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-teal/40 bg-teal/5 px-3 py-2 text-xs font-bold text-teal hover:bg-teal/15 transition-all"
                                title="Benchmark and create a requisition with this role's skills"
                              >
                                <Copy size={12} />
                                <span>Benchmark &amp; Post</span>
                              </button>
                            )}

                            {j.apply_url && (
                              <a
                                href={j.apply_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-xl border border-line bg-paper px-2.5 py-2 text-xs font-semibold text-muted hover:text-ink transition-all"
                                title="View public opening"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            {j.apply_url && (
                              <a
                                href={j.apply_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:border-teal hover:text-teal transition-all"
                              >
                                <span>Apply</span>
                                <ExternalLink size={12} />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={(e) => practiceForJob(j, e)}
                              className="flex items-center gap-1.5 rounded-xl bg-teal px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all"
                            >
                              <Sparkles size={13} />
                              <span>Practice</span>
                              <ArrowRight size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {jobs.length > LIMIT && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="rounded-xl border border-line bg-surface px-6 py-2.5 text-xs font-bold text-ink shadow-xs hover:bg-paper transition-colors"
            >
              {showAll ? "Show Fewer Roles" : `Show All ${jobs.length} Matches`}
            </button>
          </div>
        )}
      </section>

      {/* Recruiter Post Job Modal */}
      {showPostJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">Post Requisition to GIS Radar</h3>
                <p className="text-xs text-muted">Pin a new opening in your target tech corridor and ingest applicants.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPostJob(false)}
                className="rounded-lg p-1 text-muted hover:bg-paper hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostJobSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g. Senior Cloud & DevOps Engineer"
                  className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={newJob.company}
                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none focus:border-teal"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">City Hub</label>
                  <select
                    value={newJob.city}
                    onChange={(e) => setNewJob({ ...newJob, city: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none focus:border-teal"
                  >
                    {cities.map((c) => (
                      <option key={c.name} value={c.name} className="bg-surface text-ink">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Seniority Level</label>
                  <select
                    value={newJob.level}
                    onChange={(e) => setNewJob({ ...newJob, level: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none cursor-pointer"
                  >
                    <option value="Entry" className="bg-surface text-ink">Entry / Fresher</option>
                    <option value="Mid" className="bg-surface text-ink">Mid-Level</option>
                    <option value="Senior" className="bg-surface text-ink">Senior / Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Location Format</label>
                  <select
                    value={newJob.location_type}
                    onChange={(e) => setNewJob({ ...newJob, location_type: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none cursor-pointer"
                  >
                    <option value="Hybrid / In-Office" className="bg-surface text-ink">Hybrid / In-Office</option>
                    <option value="Remote / Worldwide" className="bg-surface text-ink">Remote / Worldwide</option>
                    <option value="In-Office" className="bg-surface text-ink">In-Office</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Required Skills (comma separated)</label>
                <input
                  type="text"
                  required
                  value={newJob.skills}
                  onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
                  placeholder="Python, FastAPI, Docker, PostgreSQL"
                  className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Role Description / Scope</label>
                <textarea
                  rows={3}
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Responsibilities, team goals, expected deliverables…"
                  className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPostJob(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postingJob}
                  className="rounded-xl bg-teal px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark disabled:opacity-50 cursor-pointer"
                >
                  {postingJob ? "Posting..." : "Post Opening"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
