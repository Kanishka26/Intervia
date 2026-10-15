import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Login from "./pages/Login.jsx";
import Setup from "./pages/Setup.jsx";
import Interview from "./pages/Interview.jsx";
import Report from "./pages/Report.jsx";
import History from "./pages/History.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Setup />} />
          <Route path="/history" element={<History />} />
          <Route path="/interview/:id" element={<Interview />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="*" element={<Setup />} />
        </Route>
      </Route>
    </Routes>
  );
}