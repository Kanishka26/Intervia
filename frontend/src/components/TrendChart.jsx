import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../ThemeContext.jsx";

// SVG colours are set per theme here because chart props can't read the CSS variables reliably.
const COLORS = {
  light: { grid: "#e3e5f1", axis: "#6b6d8c", line: "#4f33e9", tipBg: "#ffffff", tipText: "#1c2040" },
  dark: { grid: "#2b3052", axis: "#a0a5c2", line: "#a99fff", tipBg: "#161a33", tipText: "#e8eaf6" },
};

export default function TrendChart({ data }) {
  const { theme } = useTheme();
  const c = COLORS[theme === "dark" ? "dark" : "light"];
  const rows = data.map((d) => ({
    ...d,
    label: new Date(d.created_at * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  }));
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Overall score for each completed interview, oldest to newest"
    >
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: c.axis }} stroke={c.axis} />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: c.axis }} stroke={c.axis} />
          <Tooltip
            contentStyle={{ background: c.tipBg, border: `1px solid ${c.grid}`, borderRadius: 8 }}
            labelStyle={{ color: c.tipText }}
            itemStyle={{ color: c.tipText }}
            formatter={(v) => [`${v} / 5`, "Overall"]}
            labelFormatter={(label, items) => items?.[0]?.payload?.role || label}
          />
          <Line type="monotone" dataKey="overall" stroke={c.line} strokeWidth={2.5} dot={{ r: 4, fill: c.line }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}