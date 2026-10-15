import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return <p role="status" className="p-8 text-muted">Checking sign-in…</p>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}