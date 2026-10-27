import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import History from "./pages/History.jsx";
import Insights from "./pages/Insights.jsx";
import Interview from "./pages/Interview.jsx";
import Profile from "./pages/Profile.jsx";
import InterviewRoom from "./pages/InterviewRoom.jsx";
import Login from "./pages/Login.jsx";
import Report from "./pages/Report.jsx";
import Setup from "./pages/Setup.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/interview/:id" element={<InterviewRoom />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<Setup />} />
          <Route path="/history" element={<History />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/interview/:id" element={<Interview />} />
          <Route path="/interview/:id/text" element={<Interview />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="*" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}