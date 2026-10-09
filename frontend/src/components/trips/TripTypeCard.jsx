export default function TripTypeCard({ emoji, label, count = 0, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`spatial flex w-full flex-col items-start gap-1 rounded-panel border bg-white px-4 py-3 text-left transition ${
        active
          ? 'border-brand-500 shadow-glow'
          : 'border-line hover:border-brand-300'
      }`}
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <span className="text-xs text-muted">
        {count} {count === 1 ? 'trip' : 'trips'}
      </span>
    </button>
  );
}