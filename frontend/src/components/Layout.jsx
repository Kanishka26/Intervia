import { History, LayoutDashboard, Lightbulb, LogOut, Mic, User } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

function SideLink({ to, end, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
          isActive ? "bg-soft text-teal" : "text-muted hover:bg-paper"
        }`
      }
    >
      <Icon size={18} aria-hidden="true" />
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-wrap items-center gap-x-2 border-b border-line bg-white px-3 py-3 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:flex-nowrap md:items-stretch md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="mr-auto px-2 md:mb-6 md:mr-0">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-teal">
            Intervia
          </Link>
          <p className="hidden text-xs text-muted md:block">Smarter interview prep with AI</p>
        </div>

        <nav className="flex gap-1 md:flex-col">
          <SideLink to="/" end icon={LayoutDashboard}>Dashboard</SideLink>
          <SideLink to="/new" icon={Mic}>New interview</SideLink>
          <SideLink to="/history" icon={History}>My interviews</SideLink>
          <SideLink to="/insights" icon={Lightbulb}>Skill insights</SideLink>
          <SideLink to="/profile" icon={User}>Profile</SideLink>
        </nav>

        <div className="ml-2 flex items-center gap-2 md:ml-0 md:mt-auto md:flex-col md:items-stretch md:border-t md:border-line md:pt-4">
          <p className="hidden truncate px-2 text-sm text-muted md:block">
            {user?.displayName || user?.email}
          </p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-paper"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}