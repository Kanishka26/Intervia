const MAX = 5;

export default function ScoreBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, (value / MAX) * 100));
  const weak = value < 3;
  return (
    <div className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_3rem]">
      <span>{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={value}
        className="h-2.5 rounded-full bg-line"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${weak ? "bg-gold" : "bg-teal"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}
