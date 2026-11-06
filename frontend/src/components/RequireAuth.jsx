import { AlertTriangle, Briefcase, GraduationCap } from "lucide-react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function RequireAuth({ allowedRole = null }) {
  const { user, isEmployer, isCandidate, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p role="status" className="text-sm font-medium text-muted animate-pulse">
          Verifying security credentials &amp; permissions…
        </p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    const isEmployerRoute = allowedRole === "employer" || location.pathname.startsWith("/employer");
    const target = isEmployerRoute ? "/employer/login" : "/login";
    return <Navigate to={target} state={{ from: location.pathname }} replace />;
  }

  // Enforce role-based access
  if (allowedRole) {
    if (allowedRole === "employer" && !isEmployer) {
      // Candidate attempting to access recruiter pipeline / employer management
      return (
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-4">
            <AlertTriangle size={28} />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">Access Restricted</h2>
          <p className="mt-2 text-sm text-muted">
            The Employer Talent Portal is exclusively reserved for verified corporate recruiter and talent partner accounts. Your account is registered as a <span className="font-semibold text-ink">Candidate</span>.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-teal/90"
            >
              <GraduationCap size={16} />
              Return to Candidate Dashboard
            </Link>
            <Link
              to="/employer/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper"
            >
              <Briefcase size={16} />
              Switch to Recruiter Login
            </Link>
          </div>
        </div>
      );
    }

    if (allowedRole === "candidate" && !isCandidate) {
      // Recruiter attempting to take a candidate mock interview
      return (
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10 text-teal mb-4">
            <Briefcase size={28} />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">Recruiter Account Active</h2>
          <p className="mt-2 text-sm text-muted">
            You are currently signed in with an <span className="font-semibold text-ink">Employer / Recruiter</span> account. Candidate mock interview rooms and skill dashboards are designed for job seekers.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/employer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-teal/90"
            >
              <Briefcase size={16} />
              Open Talent Pipeline
            </Link>
            <Link
              to="/jobs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper"
            >
              View Jobs Radar
            </Link>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
}
