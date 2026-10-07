async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
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

export const startSession = (payload) => request("/api/sessions", json(payload));

export const sendAnswer = (id, answer) => request(`/api/sessions/${id}/answer`, json({ answer }));
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
