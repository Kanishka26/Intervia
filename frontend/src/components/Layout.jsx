import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-baseline justify-between px-5 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">
            Intervia
          </Link>
          <span className="hidden text-sm text-muted sm:inline">
            Practice interviews built from your own resume
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}
