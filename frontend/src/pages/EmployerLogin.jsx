import {
  ArrowRight,
  Briefcase,
  Building,
  CheckCircle2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

const input =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-teal transition-all";
const errorBox =
  "rounded-xl border border-danger/40 bg-danger/5 px-3.5 py-2 text-xs text-danger";

export default function EmployerLogin() {
  const navigate = useNavigate();
  const { user, isEmployer, signInEmployer, signUpEmployer, signInDemoEmployer, signOut } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in as employer, redirect straight to /employer
  if (user && isEmployer) {
    return <Navigate to="/employer" replace />;
  }

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (isSignup) {
      if (!name.trim() || name.trim().length < 2) {
        setError("Please enter your full recruiter name.");
        return;
      }
      if (!company.trim()) {
        setError("Please enter your organization / company name.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (isSignup) {
        await signUpEmployer(email.trim(), password, name.trim(), company.trim());
      } else {
        await signInEmployer(email.trim(), password);
      }
      navigate("/employer");
    } catch (err) {
      setError(err.message || "Authentication failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  // Quick 1-click test recruiter login
  async function handleDemoEmployer() {
    setBusy(true);
    setError("");
    try {
      await signInDemoEmployer();
      navigate("/employer");
    } catch (err) {
      setError(err.message || "Failed to launch demo recruiter session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl border border-line bg-surface shadow-xl overflow-hidden">
        {/* Left Side: Recruiter Value Proposition */}
        <div className="bg-gradient-to-br from-stage to-slate-900 p-8 text-white flex flex-col justify-between space-y-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-black text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-white text-base font-black">
                I
              </span>
              <span>Intervia</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                Recruiters
              </span>
            </Link>

            <h2 className="mt-8 font-display text-2xl sm:text-3xl font-extrabold leading-tight">
              Screen technical talent with cryptographic certainty.
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Autonomous AI technical evaluations, verified skill dossiers, and zero resume fraud.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/20 text-teal-300 shrink-0">
                <Sparkles size={14} />
              </div>
              <div>
                <strong className="text-white">AI-Conducted Technical Rounds:</strong>
                <p className="mt-0.5 opacity-80">Full multi-turn interviews calibrated to your exact role requirements.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <ShieldCheck size={14} />
              </div>
              <div>
                <strong className="text-white">On-Chain Tamper-Evident Proofs:</strong>
                <p className="mt-0.5 opacity-80">Reports anchored with SHA-256 fingerprints to Ethereum / Polygon smart contracts.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
                <Briefcase size={14} />
              </div>
              <div>
                <strong className="text-white">GIS Commute & Skill Ranking:</strong>
                <p className="mt-0.5 opacity-80">Filter qualified applicants within your office commute buffer.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Intervia Hiring Suite v2.0</span>
            <Link to="/login" className="text-teal-300 hover:underline">
              Candidate Login &rarr;
            </Link>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            {user && !isEmployer && (
              <div className="mb-4 rounded-xl border border-teal/30 bg-teal/5 p-3 text-xs text-ink flex items-center justify-between gap-3">
                <span>Signed in as candidate (<strong>{user.email || user.displayName}</strong>)</span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="font-bold text-danger hover:underline shrink-0"
                >
                  Sign Out
                </button>
              </div>
            )}
            <div className="flex rounded-xl bg-paper p-1 mb-6">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  !isSignup ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
                }`}
              >
                Employer Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  isSignup ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
                }`}
              >
                Register Company
              </button>
            </div>

            <h3 className="font-display text-xl font-bold text-ink">
              {isSignup ? "Create Recruiter Account" : "Welcome Back, Recruiter"}
            </h3>
            <p className="text-xs text-muted mt-1">
              {isSignup
                ? "Join leading engineering teams screening talent on Intervia."
                : "Sign in with your organization credentials to manage your pipeline."}
            </p>
          </div>

          {error && <div className={errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Your Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-3 text-muted" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className={`${input} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Organization / Company</label>
                  <div className="relative">
                    <Building size={15} className="absolute left-3.5 top-3 text-muted" />
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Stripe, Razorpay, Acme Corp"
                      className={`${input} pl-9`}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Work Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className={`${input} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${input} pl-9`}
                />
              </div>
            </div>

            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-muted" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`${input} pl-9`}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal py-3 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all disabled:opacity-50"
            >
              <span>{isSignup ? "Create Organization Account" : "Sign In to Recruiter Hub"}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick Demo Recruiter Button */}
          {!isSignup && (
            <div className="pt-2 border-t border-line/60">
              <button
                type="button"
                onClick={handleDemoEmployer}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal/30 bg-teal/5 py-2.5 text-xs font-bold text-teal hover:bg-teal/10 transition-colors"
              >
                <Sparkles size={14} />
                <span>1-Click Demo Recruiter Login</span>
              </button>
            </div>
          )}

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-muted hover:text-teal font-medium transition-colors">
              Looking for mock interview practice? <strong>Switch to Candidate Portal &rarr;</strong>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
