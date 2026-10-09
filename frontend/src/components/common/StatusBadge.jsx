const styles = {
  confirmed: 'text-emerald-600',
  settled: 'text-emerald-600',
  pending: 'text-amber-600',
  proposed: 'text-brand-600',
  removed: 'text-muted',
  default: 'text-muted',
};

export default function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  const cls = styles[key] || styles.default;
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border border-line bg-white px-3 py-1 text-xs font-medium ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}