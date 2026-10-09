export default function Spinner({ size = 20, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}