// Consecutive days (local time) with at least one finished interview, ending today or yesterday.
export function streakDays(trend, now = new Date()) {
  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(trend.map((t) => key(new Date(t.created_at * 1000))));
  const d = new Date(now);
  if (!days.has(key(d))) d.setDate(d.getDate() - 1); // not practised yet today: the streak can still be alive
  let n = 0;
  while (days.has(key(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}