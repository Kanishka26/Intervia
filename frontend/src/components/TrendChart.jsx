import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../ThemeContext.jsx";

// SVG colours are set per theme here because chart props can't read the CSS variables reliably.
const COLORS = {
  light: { grid: "#e3e5f1", axis: "#6b6d8c", line: "#4f33e9", tipBg: "#ffffff", tipText: "#1c2040" },
  dark: { grid: "#2b3052", axis: "#a0a5c2", line: "#a99fff", tipBg: "#161a33", tipText: "#e8eaf6" },
};

export default function TrendChart({ data, height = 240 }) {
  const { theme } = useTheme();
  const c = COLORS[theme === "dark" ? "dark" : "light"];
  const rows = data.map((d) => ({
    ...d,
    label: new Date(d.created_at * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  }));
  const last = rows.length - 1;
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Overall score for each completed interview, oldest to newest">
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.line} stopOpacity={0.22} />
              <stop offset="100%" stopColor={c.line} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} vertical={false} strokeDasharray="3 4" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: c.tipBg, border: `1px solid ${c.grid}`, borderRadius: 10 }}
            labelStyle={{ color: c.tipText }}
            itemStyle={{ color: c.tipText }}
            cursor={{ stroke: c.grid }}
            formatter={(v) => [`${v} / 5`, "Overall"]}
            labelFormatter={(label, items) => items?.[0]?.payload?.role || label}
          />
          <Area
            type="monotone"
            dataKey="overall"
            stroke={c.line}
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={(p) =>
              p.index === last ? (
                <circle key="last" cx={p.cx} cy={p.cy} r={5} fill={c.line} stroke={c.tipBg} strokeWidth={2} />
              ) : (
                <g key={p.index} />
              )
            }
            activeDot={{ r: 5, fill: c.line }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}