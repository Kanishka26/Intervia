import { useEffect, useRef } from "react";

const LEVELS = ["bg-line", "bg-teal/25", "bg-teal/50", "bg-teal/75", "bg-teal"];
const level = (n) => (n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4);
const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ActivityHeatmap({ timestamps }) {
  const box = useRef(null);

  useEffect(() => {
    if (box.current) box.current.scrollLeft = box.current.scrollWidth; // show the most recent weeks
  }, []);

  // Group answers by the viewer's local day
  const counts = new Map();
  for (const t of timestamps) {
    const k = key(new Date(t * 1000));
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - 52 * 7); // a Sunday, 52 weeks back

  const days = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    days.push({ date: new Date(d), count: counts.get(key(d)) || 0 });
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  let total = 0;
  let active = 0;
  let run = 0;
  let longest = 0;
  for (const d of days) {
    total += d.count;
    if (d.count) {
      active++;
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  let current = 0;
  let i = days.length - 1;
  if (!days[i].count) i--; // haven't practised yet today: the streak is still alive
  for (; i >= 0 && days[i].count; i--) current++;

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        <span className="font-semibold tabular-nums text-ink">{total}</span> answers in the past year ·{" "}
        {active} active days · current streak {current} · longest streak {longest}
      </p>
      <div
        ref={box}
        className="overflow-x-auto pb-2"
        role="img"
        aria-label={`${total} answers in the past year across ${active} active days. Current streak ${current} days.`}
      >
        <div className="flex gap-1">
          {weeks.map((w, wi) => {
            const m = w[0].date.getMonth();
            const showMonth = wi > 0 && m !== weeks[wi - 1][0].date.getMonth();
            return (
              <div key={wi} className="flex w-3 shrink-0 flex-col gap-1">
                <span className="h-4 whitespace-nowrap text-xs text-muted">{showMonth ? MONTHS[m] : ""}</span>
                {w.map((d) => (
                  <span
                    key={d.date.getTime()}
                    title={`${d.count} answer${d.count === 1 ? "" : "s"} on ${d.date.toLocaleDateString(undefined, { dateStyle: "medium" })}`}
                    className={`h-3 w-3 rounded-sm ${LEVELS[level(d.count)]}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}