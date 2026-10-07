// The backend keeps sessions in memory and has no "get current question" endpoint,
// so the UI keeps the latest state in sessionStorage to survive a page refresh.
const key = (id) => `intervia:session:${id}`;

export function saveSession(id, state) {
  try {
    sessionStorage.setItem(key(id), JSON.stringify(state));
  } catch {
    /* storage unavailable: refresh will lose state, nothing else breaks */
  }
}

export function loadSession(id) {
  try {
    const raw = sessionStorage.getItem(key(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
