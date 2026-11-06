const MAX = 5;

export default function ScoreBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, (value / MAX) * 100));
  const weak = value < 3;
  return (
    <div className="grid grid-cols-[8.5rem_1fr_3rem] sm:grid-cols-[11rem_1fr_3.5rem] items-center gap-3 text-sm py-1">
      <span className="font-medium text-ink truncate">{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={value}
        className="h-2 w-full rounded-full bg-line overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${weak ? "bg-amber-500" : "bg-teal"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right font-display font-bold tabular-nums text-ink text-xs sm:text-sm">
        {value.toFixed(1)} <span className="text-[11px] font-normal text-muted">/ 5</span>
      </span>
    </div>
  );
}
