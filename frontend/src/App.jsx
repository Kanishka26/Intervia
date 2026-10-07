import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Setup from "./pages/Setup.jsx";
import Interview from "./pages/Interview.jsx";
import Report from "./pages/Report.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Setup />} />
        <Route path="/interview/:id" element={<Interview />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="*" element={<Setup />} />
      </Route>
    </Routes>
  );
}
