import {
  Award,
  Briefcase,
  Building,
  CheckCircle2,
  Code2,
  Edit3,
  ExternalLink,
  FileCheck,
  FileText,
  Flame,
  Globe,
  GraduationCap,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { extractResume, getInsights, getProfile, saveProfile } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import ActivityHeatmap from "../components/ActivityHeatmap.jsx";

const TECH_HUBS = [
  "Bengaluru",
  "Delhi",
  "Gurugram",
  "Noida",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Chandigarh",
  "Indore",
  "Kochi",
  "Coimbatore",
  "Lucknow",
  "Remote / Worldwide",
];

const SKILL_SUGGESTIONS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "FastAPI",
  "Next.js",
  "Go",
  "Java",
  "C++",
  "Docker",
  "Kubernetes",
  "AWS",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST APIs",
  "System Design",
  "CI/CD",
  "Git",
  "Linux",
  "PyTorch",
  "Machine Learning",
];

const EXPERIENCE_LEVELS = [
  { id: "fresher", label: "Fresher / Intern (0-1 yrs)" },
  { id: "junior", label: "Junior Engineer (1-3 yrs)" },
  { id: "mid", label: "Mid-Level Engineer (3-5 yrs)" },
  { id: "senior", label: "Senior Engineer (5-8 yrs)" },
  { id: "lead", label: "Staff / Lead Engineer (8+ yrs)" },
];

function GithubIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedinIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function parseResumeToProfile(text) {
  const result = { skills: [] };

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  // Phone
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0];

  // GitHub
  const ghMatch = text.match(/(?:github\.com\/)([a-zA-Z0-9_-]+)/i);
  if (ghMatch) result.github = `https://github.com/${ghMatch[1]}`;

  // LinkedIn
  const liMatch = text.match(/(?:linkedin\.com\/in\/)([a-zA-Z0-9_-]+)/i);
  if (liMatch) result.linkedin = `https://linkedin.com/in/${liMatch[1]}`;

  // Grad Year
  const yearMatch = text.match(/\b(20[1-3][0-9])\b/);
  if (yearMatch) result.grad_year = Number(yearMatch[1]);

  // Degree detection
  if (/b\.?\s?tech|bachelor\s+of\s+technology/i.test(text)) result.degree = "B.Tech in Computer Science";
  else if (/b\.?\s?e|bachelor\s+of\s+engineering/i.test(text)) result.degree = "B.E. in Computer Engineering";
  else if (/b\.?\s?s|bachelor\s+of\s+science/i.test(text)) result.degree = "B.S. in Computer Science";
  else if (/m\.?\s?tech|master\s+of\s+technology/i.test(text)) result.degree = "M.Tech in Software Engineering";
  else if (/m\.?\s?s|master\s+of\s+science/i.test(text)) result.degree = "M.S. in Computer Science";

  // Skills scan
  SKILL_SUGGESTIONS.forEach((s) => {
    const escaped = s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      result.skills.push(s);
    }
  });

  // Target role guess
  if (/full[- ]?stack/i.test(text)) result.target_role = "Full-Stack Engineer";
  else if (/frontend|react|ui\b/i.test(text)) result.target_role = "Frontend Engineer";
  else if (/backend|api|server|microservice/i.test(text)) result.target_role = "Backend Engineer";
  else if (/devops|cloud|kubernetes|infra/i.test(text)) result.target_role = "DevOps & Cloud Engineer";
  else if (/machine learning|data science|ai engineer/i.test(text)) result.target_role = "Machine Learning Engineer";

  return result;
}

export default function Profile() {
  const { user, isEmployer, companyName, saveCompany } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [parsingResume, setParsingResume] = useState(false);
  const [resumeParsedCount, setResumeParsedCount] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const resumeInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getProfile(), getInsights().catch(() => ({}))])
      .then(([p, i]) => {
        if (cancelled) return;
        setProfile(p.profile || {});
        setActivity(p.activity || []);
        setStats(i || {});
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit() {
    setError("");
    setSuccess("");
    setForm({
      name: profile?.name || user?.displayName || "",
      bio: profile?.bio || "",
      country: profile?.country || "India",
      city: profile?.city || "Bengaluru",
      college: profile?.college || "",
      degree: profile?.degree || "",
      grad_year: profile?.grad_year ?? "",
      target_role: profile?.target_role || "Full-Stack Engineer",
      experience_level: profile?.experience_level || "mid",
      skills: profile?.skills || [],
      github: profile?.github || "",
      linkedin: profile?.linkedin || "",
      portfolio: profile?.portfolio || "",
      phone: profile?.phone || "",
      company_name: profile?.company_name || companyName || "",
      account_type: isEmployer ? "employer" : "candidate",
    });
    setEditing(true);
  }

  function handleAddSkill(skillToAdd) {
    const s = (skillToAdd || newSkill).trim();
    if (!s) return;
    if (form.skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setNewSkill("");
      return;
    }
    if (form.skills.length >= 30) {
      setError("Maximum 30 skills allowed.");
      return;
    }
    setForm((prev) => ({ ...prev, skills: [...prev.skills, s] }));
    setNewSkill("");
    setError("");
  }

  function handleRemoveSkill(skillToRemove) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      return;
    }

    setParsingResume(true);
    setError("");
    try {
      const { text } = await extractResume(file);
      const extracted = parseResumeToProfile(text);

      setForm((prev) => {
        const mergedSkills = Array.from(new Set([...(prev.skills || []), ...extracted.skills])).slice(0, 30);
        return {
          ...prev,
          target_role: prev.target_role || extracted.target_role || prev.target_role,
          degree: prev.degree || extracted.degree || prev.degree,
          grad_year: prev.grad_year || extracted.grad_year || prev.grad_year,
          github: prev.github || extracted.github || prev.github,
          linkedin: prev.linkedin || extracted.linkedin || prev.linkedin,
          phone: prev.phone || extracted.phone || prev.phone,
          skills: mergedSkills,
        };
      });

      setResumeParsedCount(extracted.skills.length);
      setSuccess(`Parsed ${extracted.skills.length} skills and background details from "${file.name}"!`);
    } catch (err) {
      setError(err.message || "Failed to parse resume.");
    } finally {
      setParsingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        college: form.college.trim(),
        degree: form.degree.trim(),
        grad_year: form.grad_year ? Number(form.grad_year) : null,
        target_role: form.target_role.trim(),
        experience_level: form.experience_level,
        skills: form.skills,
        github: form.github.trim(),
        linkedin: form.linkedin.trim(),
        portfolio: form.portfolio.trim(),
        phone: form.phone.trim(),
        account_type: isEmployer ? "employer" : "candidate",
        company_name: form.company_name?.trim() || "",
      };

      const { profile: saved } = await saveProfile(payload);
      setProfile(saved);
      if (isEmployer && payload.company_name) {
        saveCompany(payload.company_name);
      }
      setEditing(false);
      setSuccess("Profile successfully updated!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile && !error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 size={24} className="animate-spin text-teal" />
          <p className="text-sm font-medium">Loading profile credentials…</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const totalInterviews = stats?.interviews ?? 0;
  const totalAnswers = stats?.answers ?? 0;
  const avgScore = stats?.average != null ? stats.average.toFixed(1) : null;
  const levelObj = EXPERIENCE_LEVELS.find((l) => l.id === profile?.experience_level) || { label: "Mid-Level Engineer" };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/10 px-4 py-3 text-sm font-medium text-teal shadow-xs">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && !editing && (
        <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger shadow-xs">
          <Info size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-teal/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-teal/30 shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-indigo-600 text-2xl font-black text-white shadow-md">
                {initials}
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl sm:text-3xl font-black text-ink tracking-tight truncate">
                  {displayName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isEmployer
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      : "bg-teal/10 text-teal border border-teal/20"
                  }`}
                >
                  {isEmployer ? (
                    <>
                      <Briefcase size={12} />
                      Recruiter
                    </>
                  ) : (
                    <>
                      <GraduationCap size={12} />
                      Candidate
                    </>
                  )}
                </span>
                {profile?.city && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <MapPin size={13} className="text-teal" />
                    {profile.city}{profile.country ? `, ${profile.country}` : ""}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-muted">
                {isEmployer ? (
                  <span>
                    Talent Partner {profile?.company_name ? `@ ${profile.company_name}` : ""}
                  </span>
                ) : (
                  <span>{profile?.target_role || "Full-Stack Software Engineer"} · {levelObj.label}</span>
                )}
              </p>

              {user?.email && (
                <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                  <Mail size={13} />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark transition-all cursor-pointer"
              >
                <Edit3 size={15} />
                Edit Profile
              </button>
            )}

            {!isEmployer && (
              <Link
                to="/new"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-bold text-ink hover:bg-surface transition-all"
              >
                <MessageSquare size={15} className="text-teal" />
                Practice Interview
              </Link>
            )}
          </div>
        </div>

        {/* Social / Portfolio Links Row */}
        {(profile?.github || profile?.linkedin || profile?.portfolio || profile?.phone) && (
          <div className="mt-6 pt-5 border-t border-line flex flex-wrap items-center gap-3">
            {profile.github && (
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface hover:text-teal transition-colors"
              >
                <GithubIcon size={14} />
                <span>GitHub</span>
                <ExternalLink size={11} className="text-muted" />
              </a>
            )}
            {profile.linkedin && (
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface hover:text-teal transition-colors"
              >
                <LinkedinIcon size={14} />
                <span>LinkedIn</span>
                <ExternalLink size={11} className="text-muted" />
              </a>
            )}
            {profile.portfolio && (
              <a
                href={profile.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface hover:text-teal transition-colors"
              >
                <Globe size={14} />
                <span>Portfolio</span>
                <ExternalLink size={11} className="text-muted" />
              </a>
            )}
            {profile.phone && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted">
                <Phone size={14} />
                <span>{profile.phone}</span>
              </span>
            )}
          </div>
        )}
      </section>

      {/* EDIT MODAL / DRAWER FORM */}
      {editing && (
        <form onSubmit={handleSave} className="rounded-3xl border border-teal/40 bg-surface p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Edit Profile &amp; Preferences</h2>
              <p className="text-xs text-muted mt-0.5">Customize your credentials, target tech corridor, and skill inventory.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Resume Auto-Fill Bar (Candidate Only) */}
          {!isEmployer && (
            <div className="rounded-2xl border border-teal/20 bg-teal/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/20 text-teal">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">Auto-Fill from Resume PDF</h4>
                  <p className="text-xs text-muted">Upload your latest resume to automatically parse skills, degree, and links.</p>
                </div>
              </div>
              <div>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeUpload}
                  disabled={parsingResume}
                  className="hidden"
                  id="resume-autofill-input"
                />
                <label
                  htmlFor="resume-autofill-input"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all cursor-pointer"
                >
                  {parsingResume ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Parsing Resume…
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      Choose Resume PDF
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-xs text-danger font-medium">
              {error}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Full Name</label>
              <input
                type="text"
                required
                maxLength={60}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-teal focus:bg-surface focus:outline-none transition-all"
                placeholder="e.g. Alex Morgan"
              />
            </div>

            {isEmployer ? (
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Company / Organization</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-teal focus:bg-surface focus:outline-none transition-all"
                  placeholder="e.g. Acme Corporation"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Target Job Title</label>
                <input
                  type="text"
                  maxLength={80}
                  value={form.target_role}
                  onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-teal focus:bg-surface focus:outline-none transition-all"
                  placeholder="e.g. Full-Stack Software Engineer"
                />
              </div>
            )}

            {!isEmployer && (
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Experience Level</label>
                <select
                  value={form.experience_level}
                  onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:bg-surface focus:outline-none transition-all"
                >
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Preferred Tech Hub / City</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:bg-surface focus:outline-none transition-all"
              >
                {TECH_HUBS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Country</label>
              <input
                type="text"
                maxLength={60}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-teal focus:bg-surface focus:outline-none transition-all"
                placeholder="e.g. India"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Phone Number</label>
              <input
                type="text"
                maxLength={30}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-teal focus:bg-surface focus:outline-none transition-all"
                placeholder="e.g. +91 98765 43210"
              />
            </div>
          </div>

          {/* Bio / About */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Professional Summary / Bio ({form.bio.length}/500)
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-teal focus:bg-surface focus:outline-none transition-all"
              placeholder="Brief description of your technical passion, domain expertise, and engineering values…"
            />
          </div>

          {/* Education Section (Candidate Only) */}
          {!isEmployer && (
            <div className="rounded-2xl border border-line bg-paper/60 p-4 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                <GraduationCap size={15} />
                Academic Background
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">College / University</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.college}
                    onChange={(e) => setForm({ ...form, college: e.target.value })}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-teal focus:outline-none"
                    placeholder="e.g. IIT Bombay / BITS Pilani"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Degree &amp; Major</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.degree}
                    onChange={(e) => setForm({ ...form, degree: e.target.value })}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-teal focus:outline-none"
                    placeholder="e.g. B.Tech Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Graduation Year</label>
                  <input
                    type="number"
                    min={1990}
                    max={2040}
                    value={form.grad_year}
                    onChange={(e) => setForm({ ...form, grad_year: e.target.value })}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-teal focus:outline-none"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Skills Management Section (Candidate Only) */}
          {!isEmployer && (
            <div className="rounded-2xl border border-line bg-paper/60 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Code2 size={15} />
                  Technical Skills &amp; Stack ({form.skills.length}/30)
                </h3>
                <span className="text-[11px] text-muted">Press Enter or comma to add</span>
              </div>

              {/* Skills Tag Pills */}
              <div className="flex flex-wrap gap-2 min-h-10 items-center rounded-xl border border-line bg-surface p-2.5">
                {form.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal/10 border border-teal/20 px-2.5 py-1 text-xs font-bold text-teal"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      className="rounded-full hover:bg-teal/20 p-0.5 text-teal transition-colors"
                      title="Remove skill"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder={form.skills.length === 0 ? "Type skill and press Enter…" : "Add more…"}
                    className="w-full bg-transparent text-xs text-ink placeholder:text-muted focus:outline-none"
                  />
                  {newSkill.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddSkill()}
                      className="rounded-lg bg-teal px-2 py-1 text-xs font-bold text-white shrink-0"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Suggestion Chips */}
              <div>
                <p className="text-[11px] font-semibold text-muted mb-2">Popular additions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s))
                    .slice(0, 12)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-medium text-muted hover:border-teal/50 hover:text-teal transition-all"
                      >
                        <Plus size={11} />
                        {s}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Social Links Section */}
          <div className="rounded-2xl border border-line bg-paper/60 p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Globe size={15} />
              Online Presence &amp; Proof of Work
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                  <GithubIcon size={12} />
                  GitHub URL / Profile
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.github}
                  onChange={(e) => setForm({ ...form, github: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-teal focus:outline-none"
                  placeholder="https://github.com/username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                  <LinkedinIcon size={12} />
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-teal focus:outline-none"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                  <Globe size={12} />
                  Portfolio / Website
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.portfolio}
                  onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-teal focus:outline-none"
                  placeholder="https://yoursite.dev"
                />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-xl border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Quick Metrics Grid (Candidate View) */}
      {!isEmployer && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Interviews</span>
              <GraduationCap size={18} className="text-teal" />
            </div>
            <p className="font-display text-2xl font-black text-ink tabular-nums">{totalInterviews}</p>
            <p className="text-[11px] text-muted mt-1">Simulated sessions</p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Turn Answers</span>
              <MessageSquare size={18} className="text-indigo-400" />
            </div>
            <p className="font-display text-2xl font-black text-ink tabular-nums">{totalAnswers}</p>
            <p className="text-[11px] text-muted mt-1">Evaluated by LLM</p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Benchmark</span>
              <Award size={18} className="text-gold" />
            </div>
            <p className="font-display text-2xl font-black text-ink tabular-nums">
              {avgScore ? `${avgScore} / 5.0` : "–"}
            </p>
            <p className="text-[11px] text-muted mt-1">Technical proficiency</p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Skills Tracked</span>
              <Code2 size={18} className="text-emerald-400" />
            </div>
            <p className="font-display text-2xl font-black text-ink tabular-nums">
              {profile?.skills?.length ?? 0}
            </p>
            <p className="text-[11px] text-muted mt-1">In profile &amp; radar</p>
          </div>
        </section>
      )}

      {/* Main Content Two-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Activity Heatmap & Skills Cloud */}
        <div className="lg:col-span-2 space-y-6">
          {/* Consistency & Heatmap Card (Candidate Only) */}
          {!isEmployer ? (
            <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">Interview Practice Consistency</h2>
                    <p className="text-xs text-muted">Daily turn frequency tracked across the last 52 weeks.</p>
                  </div>
                </div>
              </div>
              <ActivityHeatmap timestamps={activity} />
            </section>
          ) : (
            <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
                  <Building size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Recruiter Dashboard Overview</h2>
                  <p className="text-xs text-muted">Manage your engineering talent pipeline and posted positions.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <Link
                  to="/employer"
                  className="rounded-2xl border border-line bg-paper p-5 hover:border-teal/50 hover:bg-surface transition-all group"
                >
                  <Briefcase size={22} className="text-teal mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-ink text-sm">Talent Pipeline</h3>
                  <p className="text-xs text-muted mt-1">Review pre-screened technical dossiers and test reports.</p>
                </Link>
                <Link
                  to="/jobs"
                  className="rounded-2xl border border-line bg-paper p-5 hover:border-teal/50 hover:bg-surface transition-all group"
                >
                  <MapPin size={22} className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-ink text-sm">GIS Jobs Radar</h3>
                  <p className="text-xs text-muted mt-1">View active tech corridor openings and spatial distributions.</p>
                </Link>
              </div>
            </section>
          )}

          {/* Technical Skills Inventory */}
          {!isEmployer && (
            <section className="rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
                    <Code2 size={18} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">Verified Skills &amp; Stack</h2>
                    <p className="text-xs text-muted">Used for GIS job compatibility and interview question tuning.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-xs font-bold text-teal hover:underline"
                >
                  Edit Skills
                </button>
              </div>

              {profile?.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-bold text-ink hover:border-teal/30 hover:bg-teal/5 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-6 text-center">
                  <Code2 size={24} className="mx-auto text-muted mb-2" />
                  <p className="text-xs text-muted">No technical skills added yet.</p>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="mt-3 text-xs font-bold text-teal hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={13} /> Add skills or upload resume
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column (1 Col): Academic & Location Details */}
        <div className="space-y-6">
          {/* Academic & Profile Details Card */}
          <section className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-5">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <User size={16} className="text-teal" />
              {isEmployer ? "Organization Details" : "Background & Education"}
            </h2>

            {profile?.bio && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Bio</p>
                <p className="text-xs text-ink/90 leading-relaxed italic bg-paper p-3 rounded-xl border border-line">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              </div>
            )}

            <dl className="space-y-3.5 text-xs">
              {isEmployer ? (
                <>
                  <div>
                    <dt className="text-muted font-medium mb-0.5">Company</dt>
                    <dd className="font-bold text-ink">{profile?.company_name || companyName || "Acme Corp"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted font-medium mb-0.5">Recruiter</dt>
                    <dd className="font-bold text-ink">{displayName}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-muted font-medium mb-0.5">Target Role</dt>
                    <dd className="font-bold text-ink">{profile?.target_role || "Full-Stack Software Engineer"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted font-medium mb-0.5">Experience Tier</dt>
                    <dd className="font-bold text-ink">{levelObj.label}</dd>
                  </div>
                  <div>
                    <dt className="text-muted font-medium mb-0.5">College / University</dt>
                    <dd className="font-bold text-ink">{profile?.college || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted font-medium mb-0.5">Degree</dt>
                    <dd className="font-bold text-ink">{profile?.degree || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted font-medium mb-0.5">Graduation Year</dt>
                    <dd className="font-bold text-ink">{profile?.grad_year || "Not specified"}</dd>
                  </div>
                </>
              )}

              <div>
                <dt className="text-muted font-medium mb-0.5">Location &amp; Commute Hub</dt>
                <dd className="font-bold text-ink flex items-center gap-1">
                  <MapPin size={12} className="text-teal" />
                  {profile?.city || "Bengaluru"}, {profile?.country || "India"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Quick Actions Card */}
          <section className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-3">
            <h3 className="font-display text-sm font-bold text-ink">Account &amp; Security</h3>
            <p className="text-xs text-muted">
              Role: <strong className="text-ink">{isEmployer ? "Employer / Recruiter" : "Candidate"}</strong>
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/settings"
                className="w-full text-center rounded-xl border border-line bg-paper px-3 py-2 text-xs font-bold text-ink hover:bg-surface transition-all"
              >
                Account Settings
              </Link>
              <Link
                to="/verify"
                className="w-full text-center rounded-xl border border-line bg-paper px-3 py-2 text-xs font-bold text-ink hover:bg-surface transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={13} className="text-teal" />
                Public Certificate Verifier
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
