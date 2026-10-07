export function ProgressBar({ value, max }: { value: number; max: number }) {
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
    <span style={{ width: `${max ? Math.min(100, Math.max(0, value / max * 100)) : 0}%` }} />
  </div>
}
