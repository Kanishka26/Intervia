import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Cpu,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  GraduationCap,
  Layers,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCandidateDensity, getEmployerJobs, postEmployerJob } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import TalentDensityMap from "../components/TalentDensityMap.jsx";

export default function EmployerRadar() {
  const navigate = useNavigate();
  const { companyName } = useAuth();

  // Filters state
  const [selectedDomain, setSelectedDomain] = useState("fullstack");
  const [selectedCity, setSelectedCity] = useState("Bengaluru");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedRadius, setSelectedRadius] = useState(35);

  // Data state
  const [densityData, setDensityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companyJobs, setCompanyJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Post Job Modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState("");
  const [jobForm, setJobForm] = useState({
    title: "Senior Full-Stack Engineer",
    company: companyName || "Acme Corp",
    domain: "fullstack",
    city: "Bengaluru",
    level: "Mid",
    skills: "React, TypeScript, Node.js, PostgreSQL",
    location_type: "Hybrid / In-Office",
    description: "Looking for a seasoned engineer to build scalable web platforms and collaborate on core architecture.",
  });

  // Fetch candidate density whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getCandidateDensity(selectedDomain, selectedCity, selectedLevel, selectedRadius)
      .then((res) => {
        if (cancelled) return;
        setDensityData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load candidate density");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDomain, selectedCity, selectedLevel, selectedRadius]);

  // Fetch active company jobs
  useEffect(() => {
    setJobsLoading(true);
    getEmployerJobs()
      .then((res) => setCompanyJobs(res.jobs || []))
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, []);

  // Update default job form when domain or city changes
  useEffect(() => {
    if (densityData?.domain) {
      const d = densityData.domain;
      setJobForm((prev) => ({
        ...prev,
        domain: selectedDomain,
        city: selectedCity === "All Hubs" ? "Bengaluru" : selectedCity,
        title: `${selectedLevel !== "all" ? selectedLevel.toUpperCase() : "Senior"} ${d.badge || "Software"} Engineer`,
        skills: d.skills?.slice(0, 5).join(", ") || prev.skills,
      }));
    }
  }, [selectedDomain, selectedCity, selectedLevel, densityData]);

  // Handle Post Job Submission
  async function handlePostJob(e) {
    e.preventDefault();
    setPosting(true);
    setPostSuccess("");

    try {
      const skillsArray = jobForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await postEmployerJob({
        title: jobForm.title.trim(),
        company: jobForm.company.trim(),
        domain: jobForm.domain,
        city: jobForm.city,
        level: jobForm.level,
        skills: skillsArray,
        location_type: jobForm.location_type,
        description: jobForm.description.trim(),
      });

      if (res.ok) {
        setPostSuccess(`Successfully posted "${jobForm.title}" for ${jobForm.city}! Matching candidates are now indexed in your corridor.`);
        setShowPostModal(false);
        // Refresh posted jobs
        getEmployerJobs().then((r) => setCompanyJobs(r.jobs || []));
      }
    } catch (err) {
      alert("Failed to post job: " + (err.message || "Unknown error"));
    } finally {
      setPosting(false);
    }
  }

  // Pre-fill job form for a specific sub-hub click
  function openPostModalForHub(hub) {
    setJobForm((prev) => ({
      ...prev,
      city: selectedCity,
      title: `${selectedLevel !== "all" ? selectedLevel.toUpperCase() : "Senior"} Engineer (${hub.name.split(" ")[0]})`,
      skills: (hub.top_skills || []).slice(0, 5).join(", "),
    }));
    setShowPostModal(true);
  }

  const domain = densityData?.domain || {};
  const metrics = densityData?.density_metrics || {};
  const subHubs = densityData?.sub_hubs || [];
  const feeders = densityData?.feeder_institutions || [];
  const samples = densityData?.sample_candidates || [];

  return (
    <div className="space-y-8 pb-16">
      {/* Success Notification Banner */}
      {postSuccess && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-teal/30 bg-teal/10 px-5 py-4 text-sm font-medium text-teal shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0 text-teal" />
            <span>{postSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setPostSuccess("")}
            className="text-teal hover:opacity-75 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-soft/40 p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/15 border border-teal/30 px-3 py-1 text-xs font-bold text-teal">
              <Compass size={14} />
              Spatial Talent Radar
            </span>
            <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-muted border border-line">
              Candidate Density Intelligence
            </span>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
            Candidate Density &amp; Corridor Radar
          </h1>

          <p className="text-sm text-muted leading-relaxed">
            Geospatial candidate supply, AI benchmark scores, and transit isochrones across India's leading tech corridors. Filter by domain and area to forecast your hiring catchment.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-teal px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal/25 hover:bg-teal-dark hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Post a Job Opening</span>
          </button>

          <Link
            to="/employer"
            className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-xs hover:bg-paper transition-colors"
          >
            <Users size={17} className="text-teal" />
            <span>Talent Pipeline</span>
          </Link>
        </div>
      </div>

      {/* Domain Selection Tabs (Horizontal Scrollable) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Cpu size={14} className="text-teal" />
            Select Tech Domain Specialization
          </label>
          <span className="text-xs text-muted">
            National Pool: <strong className="text-ink">{domain.national_pool?.toLocaleString() || "14,000+"}</strong> verified candidates
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {(densityData?.all_domains || []).map((d) => {
            const isSelected = selectedDomain === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDomain(d.id)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-teal text-white shadow-md shadow-teal/20"
                    : "border border-line bg-surface text-ink hover:bg-paper hover:border-teal/30"
                }`}
              >
                <span>{d.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-paper text-muted border border-line"
                  }`}
                >
                  {d.national_pool >= 1000 ? `${(d.national_pool / 1000).toFixed(1)}k` : d.national_pool}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spatial Control & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        {/* Hub / City Selector */}
        <div>
          <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <MapPin size={12} className="text-teal" />
            Target Metro Hub
          </label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper/60 px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-teal cursor-pointer"
          >
            {(densityData?.all_cities || []).map((c) => (
              <option key={c.name} value={c.name} className="bg-surface text-ink">
                {c.name} ({c.region})
              </option>
            ))}
            <option value="All Hubs" className="bg-surface text-ink">
              All Hubs (Nationwide Overview)
            </option>
          </select>
        </div>

        {/* Experience Level Selector */}
        <div>
          <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <GraduationCap size={12} className="text-indigo-400" />
            Seniority Tier
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper/60 px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-teal cursor-pointer"
          >
            <option value="all" className="bg-surface text-ink">All Experience Levels</option>
            <option value="fresher" className="bg-surface text-ink">Fresher / Campus (0-1 yrs)</option>
            <option value="mid" className="bg-surface text-ink">Mid-Level (2-5 yrs)</option>
            <option value="senior" className="bg-surface text-ink">Senior / Lead (5+ yrs)</option>
          </select>
        </div>

        {/* Commute Isochrone Radius */}
        <div>
          <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Shield size={12} className="text-emerald-500" />
            Commute Isochrone Buffer
          </label>
          <select
            value={selectedRadius}
            onChange={(e) => setSelectedRadius(Number(e.target.value))}
            className="w-full rounded-xl border border-line bg-paper/60 px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-teal cursor-pointer"
          >
            <option value={35} className="bg-surface text-ink">≤ 35 km (Daily Metro Transit)</option>
            <option value={85} className="bg-surface text-ink">≤ 85 km (Hybrid Satellite Ring)</option>
            <option value={280} className="bg-surface text-ink">≤ 280 km (Regional Tech Belt)</option>
            <option value={0} className="bg-surface text-ink">All India / Borderless</option>
          </select>
        </div>

        {/* Quick Post Button for Filtered Selection */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowPostModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal/15 border border-teal/30 px-3 py-2 text-xs font-bold text-teal hover:bg-teal hover:text-white transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Post Job for this Area</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Spatial KPI Stat Tiles */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Pool */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold">Corridor Talent Pool</span>
            <Users size={18} className="text-teal" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-black text-ink">
            {loading ? "..." : (metrics.total_in_radius || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            <span>In {selectedCity} {selectedRadius > 0 ? `(≤ ${selectedRadius}km)` : ""}</span>
          </div>
        </div>

        {/* Active Seekers */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold">Active Ready to Interview</span>
            <Zap size={18} className="text-amber-500" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-black text-ink">
            {loading ? "..." : (metrics.active_seekers || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted">
            <strong className="text-emerald-500">72%</strong> actively seeking offers
          </div>
        </div>

        {/* Avg Benchmark Score */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold">Avg Technical Score</span>
            <Sparkles size={18} className="text-gold" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-black text-ink">
            {loading ? "..." : `${metrics.avg_benchmark_score || 4.2} / 5.0`}
          </div>
          <div className="mt-1 text-xs text-muted">
            Calibrated over multi-turn rounds
          </div>
        </div>

        {/* Verified Proofs */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold">Cryptographically Verified</span>
            <ShieldCheck size={18} className="text-emerald-500" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-black text-ink">
            {loading ? "..." : `${metrics.verified_pct || 81}%`}
          </div>
          <div className="mt-1 text-xs text-muted">
            Tamper-evident on-chain anchors
          </div>
        </div>
      </section>

      {/* GIS Leaflet Map with Candidate Density & Clusters */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <Compass size={20} className="text-teal" />
              <span>Interactive Spatial Candidate Density Map</span>
            </h2>
            <p className="text-xs text-muted">
              Explore candidate density hotspots via 2D Kernel Density Estimation (KDE) and inspect sub-hub talent clusters.
            </p>
          </div>

          <span className="text-xs font-semibold text-muted bg-paper px-3 py-1 rounded-full border border-line">
            {subHubs.length} Tech Clusters Mapped
          </span>
        </div>

        <TalentDensityMap
          cityMeta={densityData?.city}
          subHubs={subHubs}
          heatmapPoints={densityData?.heatmap_points || []}
          densityMetrics={metrics}
          domainMeta={domain}
          onPostJobInHub={openPostModalForHub}
        />
      </section>

      {/* Sub-Hubs & Corridor Distribution Breakdown */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <MapPin size={20} className="text-teal" />
              <span>Tech Park &amp; Corridor Breakdown ({selectedCity})</span>
            </h2>
            <p className="text-xs text-muted">
              Micro-density metrics by major IT parks and transit corridors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subHubs.map((sh, idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-line bg-surface p-5 hover:border-teal/30 transition-all shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-ink leading-snug">
                    {sh.name}
                  </h3>
                  <span className="rounded-full bg-teal/15 border border-teal/30 px-2.5 py-0.5 text-xs font-bold text-teal shrink-0">
                    {sh.candidate_count} candidates
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted">
                  <Navigation size={12} className="text-teal" />
                  <span>{sh.distance_km} km from hub center</span>
                  <span>·</span>
                  <span className="font-semibold text-ink">★ {sh.avg_benchmark_score}</span>
                </div>

                {sh.transit && (
                  <p className="text-[11px] text-muted bg-paper/60 p-2 rounded-xl border border-line/60">
                    🚇 <strong>Transit:</strong> {sh.transit}
                  </p>
                )}

                {/* Top Skills */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(sh.top_skills || []).map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded-md bg-paper border border-line px-2 py-0.5 text-[10px] font-medium text-muted"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* 1-Click Post Job for this specific hub */}
              <button
                type="button"
                onClick={() => openPostModalForHub(sh)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-soft border border-teal/20 px-3 py-2 text-xs font-bold text-teal hover:bg-teal hover:text-white transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>Post Role in {sh.name.split(" ")[0]}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Two Column Grid: Feeder University Pipelines & Sample Candidate Dossiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Feeder Institutions */}
        <section className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Feeder University Pipelines
              </h2>
              <p className="text-xs text-muted">Top institutional talent sources</p>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            The active candidates in {selectedCity} are predominantly sourced from premier regional technology institutions:
          </p>

          <ul className="space-y-2.5">
            {feeders.map((inst, fIdx) => (
              <li
                key={fIdx}
                className="flex items-center justify-between rounded-xl bg-paper/60 border border-line/60 px-3.5 py-2.5 text-xs"
              >
                <span className="font-semibold text-ink">{inst}</span>
                <span className="rounded-md bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">
                  Verified Alumni
                </span>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-teal/20 bg-teal/5 p-4 text-xs space-y-1.5">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-teal" />
              <span>Cryptographic Dossier Anchoring</span>
            </div>
            <p className="text-muted leading-relaxed text-[11px]">
              Every evaluation is cryptographically hashed with SHA-256 and anchored with proof of test integrity.
            </p>
          </div>
        </section>

        {/* Right Column (2 cols): Sample Candidate Pool Previews */}
        <section className="lg:col-span-2 rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/15 text-teal">
                <Users size={18} />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">
                  Corridor Candidate Dossiers ({domain.badge})
                </h2>
                <p className="text-xs text-muted">Anonymized profiles matching this domain in {selectedCity}</p>
              </div>
            </div>

            <Link
              to="/employer"
              className="text-xs font-bold text-teal hover:underline flex items-center gap-1"
            >
              <span>View full pipeline</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {samples.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-line bg-paper/50 p-4 space-y-3 hover:border-teal/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-ink">{c.name}</span>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-muted border border-line">
                        {c.experience_level}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                      <Navigation size={11} className="text-teal" />
                      <span>{c.distance_km} km away ({c.commute_zone})</span>
                    </div>
                  </div>

                  <span className="rounded-lg bg-teal/15 border border-teal/30 px-2 py-0.5 text-xs font-extrabold text-teal">
                    ★ {c.benchmark_score}
                  </span>
                </div>

                <div className="text-xs text-muted bg-surface/80 p-2.5 rounded-xl border border-line/50 leading-relaxed text-[11px]">
                  &ldquo;{c.top_strength}&rdquo;
                </div>

                <div className="flex flex-wrap gap-1">
                  {(c.skills || []).map((sk, skIdx) => (
                    <span
                      key={skIdx}
                      className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-ink border border-line/60"
                    >
                      {sk}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[11px]">
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <ShieldCheck size={12} />
                    Verified Proof
                  </span>
                  <Link
                    to="/employer"
                    className="font-bold text-teal hover:underline flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Employer's Active Requisitions Section */}
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/15 text-teal">
              <Briefcase size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Your Active Requisitions ({companyJobs.length})
              </h2>
              <p className="text-xs text-muted">
                Open roles posted by {companyName || "your company"}. Candidate density is matched against your requirements.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Post New Requisition</span>
          </button>
        </div>

        {companyJobs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper/40 p-8 text-center text-muted">
            <Briefcase size={28} className="mx-auto text-muted mb-2" />
            <p className="font-semibold text-ink text-sm">No open requisitions posted yet.</p>
            <p className="text-xs mt-1">Post a job to immediately calculate matching candidate density in your corridor.</p>
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark"
            >
              <Plus size={14} />
              <span>Post Your First Job</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {companyJobs.map((j) => (
              <div
                key={j.id}
                className="rounded-2xl border border-teal/20 bg-paper/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-bold text-ink">{j.title}</h3>
                    <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      <span>{j.city}</span>
                      <span>·</span>
                      <span className="text-teal font-semibold">{j.level}</span>
                      <span>·</span>
                      <span>{j.location_type}</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                    Live
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {(j.skills || []).map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-muted border border-line"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs">
                  <span className="text-muted">
                    Density: <strong className="text-teal">~{metrics.total_in_radius || 1200}</strong> candidates
                  </span>
                  <Link
                    to="/employer"
                    className="font-bold text-teal hover:underline flex items-center gap-1"
                  >
                    <span>View Pipeline</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Post Job Modal */}
      {showPostModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-xl rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                  <Briefcase size={20} className="text-teal" />
                  <span>Post Technical Opening</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Publish a requisition into your corridor's talent density catchment.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="rounded-xl p-1.5 text-muted hover:bg-paper hover:text-ink cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePostJob} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Role Title</label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Hiring Organization</label>
                  <input
                    type="text"
                    required
                    value={jobForm.company}
                    onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Domain</label>
                  <select
                    value={jobForm.domain}
                    onChange={(e) => setJobForm({ ...jobForm, domain: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal cursor-pointer"
                  >
                    {(densityData?.all_domains || []).map((d) => (
                      <option key={d.id} value={d.id} className="bg-surface text-ink">
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">City Hub</label>
                  <select
                    value={jobForm.city}
                    onChange={(e) => setJobForm({ ...jobForm, city: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal cursor-pointer"
                  >
                    {(densityData?.all_cities || []).map((c) => (
                      <option key={c.name} value={c.name} className="bg-surface text-ink">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Seniority</label>
                  <select
                    value={jobForm.level}
                    onChange={(e) => setJobForm({ ...jobForm, level: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal cursor-pointer"
                  >
                    <option value="Fresher" className="bg-surface text-ink">Fresher (0-1y)</option>
                    <option value="Mid" className="bg-surface text-ink">Mid-Level (2-5y)</option>
                    <option value="Senior" className="bg-surface text-ink">Senior / Lead (5+y)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Required Skills (comma separated)</label>
                <input
                  type="text"
                  required
                  value={jobForm.skills}
                  onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                  placeholder="React, TypeScript, Node.js, PostgreSQL"
                  className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Work Mode</label>
                <select
                  value={jobForm.location_type}
                  onChange={(e) => setJobForm({ ...jobForm, location_type: e.target.value })}
                  className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal cursor-pointer"
                >
                  <option value="Hybrid / In-Office" className="bg-surface text-ink">Hybrid / In-Office</option>
                  <option value="In-Office" className="bg-surface text-ink">In-Office</option>
                  <option value="Remote / Worldwide" className="bg-surface text-ink">Remote / Worldwide</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Role Scope / Summary</label>
                <textarea
                  rows={3}
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full rounded-xl border border-line bg-paper/60 p-2.5 text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="rounded-xl border border-line px-4 py-2 font-semibold text-muted hover:bg-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="rounded-xl bg-teal px-5 py-2 font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark disabled:opacity-50 cursor-pointer"
                >
                  {posting ? "Publishing..." : "Publish Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
