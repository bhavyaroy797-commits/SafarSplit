export default function Pill({ children, active = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium ${
        active
          ? 'border border-transparent bg-brand-500 text-white shadow-glow'
          : 'border border-line bg-white text-ink'
      } ${className}`}
    >
      {children}
    </span>
  );
}