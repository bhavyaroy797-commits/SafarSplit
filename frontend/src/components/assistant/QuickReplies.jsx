export default function QuickReplies({ options = [], onPick }) {
  if (!options.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onPick?.(opt)}
          className="rounded-pill border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-brand-500 hover:bg-brand-50"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}