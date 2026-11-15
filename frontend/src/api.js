import { auth } from "./firebase.js";

async function request(path, options = {}) {
  const token = await auth?.currentUser?.getIdToken();
  const role = localStorage.getItem("intervia_user_role") || "candidate";
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-User-Role": role,
  };
  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running on port 8000.");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      else if (Array.isArray(body.detail))
        msg = body.detail.map((d) => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`).join("; ");
    } catch {
      /* keep default message */
    }
    throw new Error(msg);
  }
  return res.json();
}

const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const extractResume = (file) => {
  const form = new FormData();
  form.append("file", file);
  return request("/api/resume/extract", { method: "POST", body: form });
};

export const transcribeAudio = (blob) => {
  const form = new FormData();
  form.append("file", blob, "response.webm");
  return request("/api/speech/transcribe", { method: "POST", body: form });
};

export const startSession = (payload) => request("/api/sessions", json(payload));

export const sendAnswer = (id, answer, speech = null, vision = null) =>
  request(`/api/sessions/${id}/answer`, json({ answer, speech, vision }));
export const finishSession = (id) => request(`/api/sessions/${id}/finish`, { method: "POST" });

// Memoize the in-flight request so React StrictMode's double effect
// doesn't trigger two report generations (each one is an LLM call).
const reportRequests = new Map();
export function getReport(id) {
  if (!reportRequests.has(id)) {
    const p = request(`/api/sessions/${id}/report`).catch((e) => {
      reportRequests.delete(id);
      throw e;
    });
    reportRequests.set(id, p);
  }
  return reportRequests.get(id);
}
export const listSessions = () => request("/api/sessions");

export const getSession = (id) => request(`/api/sessions/${id}`);

export const deleteSession = (id) => request(`/api/sessions/${id}`, { method: "DELETE" });
export const getInsights = () => request("/api/insights");

export const getProfile = () => request("/api/profile");
export const saveProfile = (profile) => request("/api/profile", { ...json(profile), method: "PUT" });

export const getJobMatches = (city, refresh = false) => {
  const params = [];
  if (city) params.push(`city=${encodeURIComponent(city)}`);
  if (refresh) params.push("refresh=true");
  const qs = params.length ? `?${params.join("&")}` : "";
  return request(`/api/jobs/match${qs}`);
};
export const deleteAllData = () => request("/api/me/data", { method: "DELETE" });

export const anchorReport = (id, redo = false) =>
  request(`/api/sessions/${id}/anchor${redo ? "?redo=true" : ""}`, { method: "POST" });
export const verifyReport = (id) => request(`/api/sessions/${id}/verify`);

export const publicVerify = (target) => request(`/api/public/verify/${encodeURIComponent(target)}`);

export const getEmployerPipeline = (role = "", level = "") => {
  const params = [];
  if (role) params.push(`role=${encodeURIComponent(role)}`);
  if (level) params.push(`level=${encodeURIComponent(level)}`);
  const qs = params.length ? `?${params.join("&")}` : "";
  return request(`/api/employer/pipeline${qs}`);
};

export const getCandidateDossier = (sid) => request(`/api/employer/candidates/${sid}/dossier`);

export const postEmployerJob = (job) => request("/api/employer/jobs", json(job));

export const getCandidateDensity = (domain = "fullstack", city = "Bengaluru", level = "all", radius = 35) => {
  const params = [];
  if (domain) params.push(`domain=${encodeURIComponent(domain)}`);
  if (city) params.push(`city=${encodeURIComponent(city)}`);
  if (level) params.push(`level=${encodeURIComponent(level)}`);
  if (radius !== undefined) params.push(`radius_km=${encodeURIComponent(radius)}`);
  const qs = params.length ? `?${params.join("&")}` : "";
  return request(`/api/employer/candidate-density${qs}`);
};

export const getEmployerJobs = () => request("/api/employer/jobs");
