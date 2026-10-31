
import {
  History,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MapPin,
  Mic,
  Moon,
  Settings,
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
        `relative flex items-center gap-2 whitespace-nowrap px-2 py-4 text-sm font-medium sm:px-3 ${
          isActive
            ? "text-ink after:absolute after:inset-x-2 after:bottom-0 sm:after:inset-x-3 after:h-0.5 after:rounded-full after:bg-bar"
            : "text-muted hover:text-ink"
        }`
      }
    >
      <Icon size={18} aria-hidden="true" />
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{children}</span>
    </NavLink>
  );
}

// Google profile photo when available,
// otherwise display the first letter of the name.
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
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex items-center justify-center rounded-full bg-teal font-semibold text-white"
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
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-paper"
    >
      {dark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

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

  const name = user?.displayName || user?.email || "Signed in";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center rounded-full hover:ring-2 hover:ring-line focus-visible:ring-2"
      >
        <Avatar user={user} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar user={user} size={40} />

            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>

              {user?.email && (
                <p className="truncate text-sm text-muted">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <hr className="my-1 border-line" />

          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-paper"
          >
            <User size={16} aria-hidden="true" />
            Profile
          </Link>

          <Link
            role="menuitem"
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-paper"
          >
            <Settings size={16} aria-hidden="true" />
            Settings
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-paper"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>

          <p className="hidden px-3 py-2 text-xs text-muted md:block">
            Smarter interview prep with AI
          </p>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5">

          <Link
            to="/dashboard"
            className="font-display text-2xl font-extrabold tracking-tight text-teal"
          >
            Intervia
          </Link>

          <nav
            aria-label="Main"
            className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto"
          >
            <TopLink
              to="/dashboard"
              icon={LayoutDashboard}
              short="Home"
            >
              Dashboard
            </TopLink>

            <TopLink
              to="/new"
              icon={Mic}
              short="New"
            >
              New interview
            </TopLink>

            <TopLink
              to="/history"
              icon={History}
              short="History"
            >
              My interviews
            </TopLink>

            <TopLink
              to="/insights"
              icon={Lightbulb}
              short="Insights"
            >
              Skill insights
            </TopLink>

            <TopLink
              to="/jobs"
              icon={MapPin}
              short="Jobs"
            >
              Jobs map
            </TopLink>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
