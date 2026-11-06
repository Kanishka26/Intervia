import {
  Briefcase,
  History,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MapPin,
  Mic,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useTheme } from "../ThemeContext.jsx";

function TopLink({ to, end, icon: Icon, short, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-teal/10 text-teal font-semibold shadow-xs"
            : "text-muted hover:bg-paper hover:text-ink"
        }`
      }
    >
      <Icon size={17} aria-hidden="true" />
      <span className="sm:hidden">{short || children}</span>
      <span className="hidden sm:inline">{children}</span>
    </NavLink>
  );
}

function Avatar({ user, size = 36 }) {
  const [broken, setBroken] = useState(false);
  const name = user?.displayName || user?.email || "?";

  if (user?.photoURL && !broken) {
    return (
      <img
        src={user.photoURL}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="rounded-full object-cover ring-2 ring-line"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex items-center justify-center rounded-full bg-teal font-semibold text-white ring-2 ring-line"
      style={{ width: size, height: size }}
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors"
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

function ProfileMenu() {
  const { user, isEmployer, companyName, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const name = user?.displayName || user?.email || "User";

  useEffect(() => {
    if (!open) return undefined;

    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full focus:outline-none"
      >
        <Avatar user={user} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar user={user} size={40} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{name}</p>
              <p className="truncate text-xs text-muted">
                {isEmployer
                  ? companyName
                    ? `Recruiter · ${companyName}`
                    : "Employer / Recruiter"
                  : "Candidate Account"}
              </p>
            </div>
          </div>

          <hr className="my-1.5 border-line" />

          {!isEmployer ? (
            <Link
              role="menuitem"
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-paper"
            >
              <User size={16} aria-hidden="true" className="text-muted" />
              Candidate Profile
            </Link>
          ) : (
            <>
              <Link
                role="menuitem"
                to="/employer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-paper"
              >
                <Briefcase size={16} aria-hidden="true" className="text-muted" />
                Recruiter Dashboard
              </Link>
              <Link
                role="menuitem"
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-paper"
              >
                <User size={16} aria-hidden="true" className="text-muted" />
                Company &amp; Profile
              </Link>
            </>
          )}

          <Link
            role="menuitem"
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-paper"
          >
            <Settings size={16} aria-hidden="true" className="text-muted" />
            Settings
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { isEmployer, companyName } = useAuth();

  return (
    <div className="min-h-screen bg-paper text-ink transition-colors duration-200">
      <div className="h-[2.5px] w-full bg-gradient-to-r from-teal via-indigo-500 to-sky-400" />
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              to={isEmployer ? "/employer" : "/dashboard"}
              className="flex items-center gap-2 font-display text-2xl font-black tracking-tight text-teal"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-white text-base font-black shadow-xs">
                I
              </span>
              <span>Intervia</span>
              {isEmployer && (
                <span className="hidden sm:inline-block rounded-md bg-teal/10 border border-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal">
                  Employer
                </span>
              )}
            </Link>

            {/* Role-Segregated Desktop Navigation */}
            <nav aria-label="Main" className="hidden md:flex items-center gap-1.5">
              {isEmployer ? (
                <>
                  <TopLink to="/employer" icon={Briefcase}>Talent Pipeline</TopLink>
                  <TopLink to="/jobs" icon={MapPin}>Jobs Radar</TopLink>
                  <TopLink to="/verify" icon={ShieldCheck}>Public Verifier</TopLink>
                </>
              ) : (
                <>
                  <TopLink to="/dashboard" icon={LayoutDashboard}>Dashboard</TopLink>
                  <TopLink to="/new" icon={Mic}>New interview</TopLink>
                  <TopLink to="/history" icon={History}>My interviews</TopLink>
                  <TopLink to="/insights" icon={Lightbulb}>Skill insights</TopLink>
                  <TopLink to="/jobs" icon={MapPin}>Jobs map</TopLink>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isEmployer && (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/5 px-3 py-1 text-xs font-semibold text-teal">
                <Briefcase size={13} />
                <span>{companyName || "Recruiter"}</span>
              </div>
            )}

            <ThemeToggle />
            <ProfileMenu />
          </div>

          {/* Role-Segregated Mobile Navigation */}
          <nav aria-label="Main mobile" className="flex w-full md:hidden items-center justify-around gap-1 overflow-x-auto pt-1 border-t border-line/60">
            {isEmployer ? (
              <>
                <TopLink to="/employer" icon={Briefcase} short="Pipeline">Pipeline</TopLink>
                <TopLink to="/jobs" icon={MapPin} short="Radar">Jobs Radar</TopLink>
                <TopLink to="/verify" icon={ShieldCheck} short="Verify">Verifier</TopLink>
              </>
            ) : (
              <>
                <TopLink to="/dashboard" icon={LayoutDashboard} short="Dash">Dashboard</TopLink>
                <TopLink to="/new" icon={Mic} short="New">New</TopLink>
                <TopLink to="/history" icon={History} short="History">History</TopLink>
                <TopLink to="/insights" icon={Lightbulb} short="Skills">Insights</TopLink>
                <TopLink to="/jobs" icon={MapPin} short="Jobs">Jobs</TopLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
