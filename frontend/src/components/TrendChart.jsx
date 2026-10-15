import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function TrendChart({ data }) {
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
          <CartesianGrid stroke="#e3e5f1" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6b6d8c" />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} stroke="#6b6d8c" />
          <Tooltip
            formatter={(v) => [`${v} / 5`, "Overall"]}
            labelFormatter={(label, items) => items?.[0]?.payload?.role || label}
          />
          <Line type="monotone" dataKey="overall" stroke="#4f33e9" strokeWidth={2.5} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}