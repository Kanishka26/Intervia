import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { useAuth } from "./AuthContext.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Employer from "./pages/Employer.jsx";
import EmployerLogin from "./pages/EmployerLogin.jsx";
import History from "./pages/History.jsx";
import Insights from "./pages/Insights.jsx";
import InterviewRoom from "./pages/InterviewRoom.jsx";
import Jobs from "./pages/Jobs.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import PublicVerify from "./pages/PublicVerify.jsx";
import Report from "./pages/Report.jsx";
import Settings from "./pages/Settings.jsx";
import Setup from "./pages/Setup.jsx";

function TextRedirect() {
  const { id } = useParams();
  return <Navigate to={`/interview/${id}`} replace />;
}

function DefaultHome() {
  const { isEmployer } = useAuth();
  return <Navigate to={isEmployer ? "/employer" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Candidate Auth */}
      <Route path="/login" element={<Login />} />

      {/* Dedicated Employer & Recruiter Auth */}
      <Route path="/employer/login" element={<EmployerLogin />} />

      {/* Public Cryptographic Verifier (no login required) */}
      <Route path="/verify" element={<PublicVerify />} />
      <Route path="/verify/:id" element={<PublicVerify />} />

      {/* Candidate-Only Protected Routes */}
      <Route element={<RequireAuth allowedRole="candidate" />}>
        {/* Full-screen immersive interactive video classroom */}
        <Route path="/interview/:id" element={<InterviewRoom />} />
        <Route path="/interview/:id/text" element={<TextRedirect />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new" element={<Setup />} />
          <Route path="/history" element={<History />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/report/:id" element={<Report />} />
        </Route>
      </Route>

      {/* Employer-Only Protected Routes */}
      <Route element={<RequireAuth allowedRole="employer" />}>
        <Route element={<Layout />}>
          <Route path="/employer" element={<Employer />} />
        </Route>
      </Route>

      {/* Shared Authenticated Routes */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<DefaultHome />} />
        </Route>
      </Route>
    </Routes>
  );
}
