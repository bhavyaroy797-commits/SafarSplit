import { pickCover } from '../../utils/constants';

export default function TripCover({
  destination = '',
  className = '',
  overlay = false,
  rounded = 'rounded-card',
  children,
}) {
  const src = pickCover(destination);
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      {/* Gradient fallback sits behind; if image fails, gradient is visible */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-brand-300 via-brand-500 to-indigo-700"
      />
      <img
        src={src}
        alt={destination || 'Trip cover'}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.opacity = 0;
        }}
        className="relative h-full w-full object-cover transition-opacity duration-500"
      />
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
      )}
      {children}
    </div>
  );
}