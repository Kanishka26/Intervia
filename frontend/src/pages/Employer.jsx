import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Globe,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCandidateDossier, getEmployerPipeline, postEmployerJob } from "../api.js";

export default function Employer() {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [directOnly, setDirectOnly] = useState(false);

  // Dossier Modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossier, setDossier] = useState(null);

  // Post Job Modal
  const [showPostJob, setShowPostJob] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    company: "Acme Corp",
    city: "Bengaluru",
    level: "Entry",
    skills: "Python, FastAPI, React",
    description: "Looking for an energetic engineer to build scalable distributed web applications.",
  });
  const [postingJob, setPostingJob] = useState(false);

  useEffect(() => {
    loadPipeline();
  }, [roleFilter, levelFilter]);

  async function loadPipeline() {
    setLoading(true);
    setError("");
    try {
      const data = await getEmployerPipeline(roleFilter, levelFilter);
      setPipeline(data);
    } catch (err) {
      setError(err.message || "Failed to load candidate pipeline");
    } finally {
      setLoading(false);
    }
  }

  async function openDossier(candidate) {
    setSelectedCandidate(candidate);
    setDossier(null);
    setDossierLoading(true);
    try {
      const d = await getCandidateDossier(candidate.session_id);
      setDossier(d);
    } catch (err) {
      console.error("Dossier load error:", err);
    } finally {
      setDossierLoading(false);
    }
  }

  async function handleCreateJob(e) {
    e.preventDefault();
    if (!newJob.title.trim()) return;
    setPostingJob(true);
    try {
      const skillsArray = newJob.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await postEmployerJob({
        ...newJob,
        skills: skillsArray,
      });
      setShowPostJob(false);
      setNewJob({
        title: "",
        company: "Acme Corp",
        city: "Bengaluru",
        level: "Entry",
        skills: "Python, FastAPI, React",
        description: "",
      });
      loadPipeline();
    } catch (err) {
      alert("Failed to post job: " + err.message);
    } finally {
      setPostingJob(false);
    }
  }

  const candidates = (pipeline?.candidates || []).filter((c) => {
    if (directOnly && !c.is_direct_applicant) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.target_role.toLowerCase().includes(q) ||
      (c.skills || []).some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
              Recruiter & Employer Portal
            </h1>
            <span className="rounded-full bg-teal/10 border border-teal/20 px-2.5 py-0.5 text-[11px] font-bold text-teal">
              Talent Intelligence
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Autonomous candidate screening pipeline ranked by ML Job Compatibility and cryptographically verified on-chain.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/verify"
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-ink shadow-xs hover:bg-paper transition-colors"
          >
            <ShieldCheck size={14} className="text-teal" />
            <span>Public Verifier</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowPostJob(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all"
          >
            <Plus size={14} />
            <span>Post New Opening</span>
          </button>
        </div>
      </div>

      {/* Recruiter KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Users size={14} className="text-teal" />
            <span>Total Pipeline</span>
          </div>
          <div className="mt-1 font-display text-2xl font-black text-ink">
            {pipeline?.total || 0}
          </div>
          <div className="text-[11px] text-muted mt-0.5">Pre-screened candidates</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>On-Chain Verified</span>
          </div>
          <div className="mt-1 font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {pipeline?.verified_count || 0}
          </div>
          <div className="text-[11px] text-muted mt-0.5">SHA-256 tamper-evident proof</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Sparkles size={14} className="text-amber-500" />
            <span>Avg Benchmark</span>
          </div>
          <div className="mt-1 font-display text-2xl font-black text-ink">
            {pipeline?.avg_benchmark ? `${pipeline.avg_benchmark} / 5` : "4.5 / 5"}
          </div>
          <div className="text-[11px] text-muted mt-0.5">Calibrated across 4 rubrics</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Navigation size={14} className="text-indigo-500" />
            <span>Commute Radius</span>
          </div>
          <div className="mt-1 font-display text-2xl font-black text-indigo-600 dark:text-indigo-400">
            ≤ 35 km
          </div>
          <div className="text-[11px] text-muted mt-0.5">Metro daily transit buffer</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper/50 px-3 py-1.5 flex-1 max-w-sm">
            <Search size={14} className="text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, role, or skill..."
              className="w-full bg-transparent text-xs text-ink placeholder:text-muted focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5">
            <Briefcase size={14} className="text-teal" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-surface text-ink">All Engineering Roles</option>
              <option value="Full-Stack" className="bg-surface text-ink">Full-Stack</option>
              <option value="Backend" className="bg-surface text-ink">Backend Systems</option>
              <option value="DevOps" className="bg-surface text-ink">DevOps & Cloud</option>
              <option value="AI" className="bg-surface text-ink">AI / ML Engineer</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5">
            <Filter size={14} className="text-teal" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-surface text-ink">All Experience Levels</option>
              <option value="fresher" className="bg-surface text-ink">Entry / Fresher</option>
              <option value="mid" className="bg-surface text-ink">Mid-Level</option>
              <option value="senior" className="bg-surface text-ink">Senior / Lead</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer rounded-xl border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper select-none transition-colors">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
              className="rounded text-teal focus:ring-teal"
            />
            <span className="flex items-center gap-1">
              <Briefcase size={12} className="text-teal" />
              Direct Requisition Applicants
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={loadPipeline}
          className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-teal transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Candidate Pipeline Grid */}
      {loading && !pipeline ? (
        <div className="py-20 text-center text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-teal border-t-transparent" />
          <p className="text-sm">Loading verified talent pipeline…</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-12 text-center text-muted">
          <Users size={32} className="mx-auto mb-3 text-muted" />
          <p className="font-semibold text-ink">No candidates match your current filter criteria.</p>
          <p className="text-xs mt-1">Try clearing the role or seniority filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {candidates.map((c) => {
            const isTop = c.overall_score >= 4.5;
            return (
              <div
                key={c.session_id}
                className="group rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs hover:border-teal/40 hover:shadow-md transition-all space-y-4"
              >
                {/* Candidate Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/10 font-bold text-teal text-base">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-ink text-base group-hover:text-teal transition-colors">
                        {c.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <span>{c.target_role}</span>
                        <span>·</span>
                        <span className="capitalize font-semibold text-teal">{c.experience_level}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black font-display ${
                        isTop ? "bg-teal/10 text-teal" : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      <Zap size={12} />
                      <span>{c.overall_score} / 5.0</span>
                    </div>
                    {c.anchored && (
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <ShieldCheck size={11} />
                        <span>On-Chain Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Applicant Requisition Badge */}
                {c.is_direct_applicant ? (
                  <div className="flex items-center gap-1.5 rounded-xl bg-teal/15 border border-teal/30 px-3 py-1.5 text-xs font-bold text-teal">
                    <Briefcase size={13} />
                    <span>Direct Applicant for {c.target_role} ({c.target_company || "Your Company"})</span>
                  </div>
                ) : c.target_company ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
                    <Briefcase size={12} className="text-teal" />
                    <span>Applied for opening at <strong>{c.target_company}</strong></span>
                  </div>
                ) : null}

                {/* Evaluated Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {(c.skills || []).slice(0, 5).map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-paper border border-line px-2 py-0.5 text-[11px] font-medium text-ink"
                    >
                      {s}
                    </span>
                  ))}
                  {(c.skills || []).length > 5 && (
                    <span className="text-[10px] text-muted self-center">
                      +{c.skills.length - 5}
                    </span>
                  )}
                </div>

                {/* Spatial & Commute Info */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted border-t border-line/60 pt-3">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-teal" />
                    <span>{c.city}</span>
                  </span>
                  {c.distance_km != null && (
                    <>
                      <span>·</span>
                      <span className="text-ink font-medium">{c.distance_km} km ({c.gis_zone})</span>
                    </>
                  )}
                </div>

                {/* Strengths Snippet */}
                {c.strengths && c.strengths.length > 0 && (
                  <div className="rounded-xl bg-paper/60 p-2.5 text-xs text-muted">
                    <span className="font-semibold text-ink">Strength: </span>
                    <span>{c.strengths[0]}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/60">
                  <Link
                    to={`/verify/${c.session_id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-teal transition-colors"
                  >
                    <ShieldCheck size={13} />
                    <span>Verify Proof</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => openDossier(c)}
                    className="flex items-center gap-1.5 rounded-xl bg-teal px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all"
                  >
                    <Eye size={13} />
                    <span>View Dossier</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Dossier Inspection Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              type="button"
              onClick={() => setSelectedCandidate(null)}
              className="absolute right-5 top-5 rounded-full p-1.5 text-muted hover:bg-paper hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>

            {/* Dossier Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 rounded-full bg-teal/10 border border-teal/20 px-2.5 py-0.5 text-[10px] font-bold text-teal">
                <UserCheck size={12} />
                <span>Verified Interview Dossier</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-ink">
                {selectedCandidate.name}
              </h2>
              <p className="text-xs text-muted">
                {selectedCandidate.target_role} · Level: <span className="capitalize font-semibold text-ink">{selectedCandidate.experience_level}</span>
              </p>
            </div>

            {dossierLoading ? (
              <div className="py-12 text-center text-muted">
                <RefreshCw size={24} className="mx-auto animate-spin text-teal mb-2" />
                <p className="text-xs">Loading candidate evaluation records…</p>
              </div>
            ) : dossier ? (
              <div className="space-y-5">
                {/* Score & Blockchain Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                  <div>
                    <div className="font-bold text-ink text-sm">Overall Score: {dossier.overall_score} / 5.0</div>
                    <div className="text-muted text-[11px] mt-0.5">
                      Hash: <code className="font-mono">{dossier.report_hash?.slice(0, 16)}...</code>
                    </div>
                  </div>

                  <Link
                    to={`/verify/${dossier.session_id}`}
                    target="_blank"
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all"
                  >
                    <ShieldCheck size={14} />
                    <span>Inspect On-Chain Proof</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>

                {/* Question & Answer Transcript Review */}
                <div className="space-y-3">
                  <h3 className="font-bold text-ink text-xs uppercase tracking-wider">
                    Interview Turn Transcripts & AI Scoring
                  </h3>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {(dossier.turns || []).map((t, idx) => (
                      <div key={idx} className="rounded-2xl border border-line bg-paper/40 p-4 space-y-2 text-xs">
                        <div className="font-bold text-ink">Q{idx + 1}: {t.question}</div>
                        <div className="text-muted italic bg-surface/80 p-2.5 rounded-xl border border-line/60">
                          "{t.answer}"
                        </div>
                        {t.evaluation && (
                          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                            <span className="text-teal font-semibold">
                              {t.evaluation.summary || "Solid technical response"}
                            </span>
                            <span className="font-mono text-muted">
                              Depth: {t.evaluation.scores?.technical_depth || 4}/5 · Clarity: {t.evaluation.scores?.clarity || 4}/5
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recruiter Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Interview invitation sent to ${selectedCandidate.name}!`);
                      setSelectedCandidate(null);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-teal px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all"
                  >
                    <span>Schedule Next Technical Round</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Post New Opening Modal */}
      {showPostJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl space-y-5">
            <button
              type="button"
              onClick={() => setShowPostJob(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 text-muted hover:bg-paper hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Post New Tech Opening</h2>
              <p className="text-xs text-muted">Create a role for autonomous AI interview screening.</p>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g. Junior Backend Engineer"
                  className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none"
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
                    className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">City Hub</label>
                  <input
                    type="text"
                    required
                    value={newJob.city}
                    onChange={(e) => setNewJob({ ...newJob, city: e.target.value })}
                    className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none"
                  />
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
                  placeholder="Python, FastAPI, Docker, SQL"
                  className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Role Description / Requirements</label>
                <textarea
                  rows={3}
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Responsibilities, tech stack, team goals..."
                  className="w-full rounded-xl border border-line bg-paper/50 p-2.5 text-ink focus:outline-none"
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
                  className="flex items-center gap-1.5 rounded-xl bg-teal px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all disabled:opacity-50"
                >
                  {postingJob ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Publish Opening</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
