import { useMemo } from 'react';
import { formatINR, initials } from '../../utils/format';

/**
 * Renders a small SVG debt graph: members on a circle, arrows for each payment.
 * Two modes: "before" (naive pairwise) and "after" (settlement transfers).
 */
export default function DebtGraph({
  members,
  transfers,
  label,
  muted = false,
  size = 320,
}) {
  const layout = useMemo(() => {
    const n = Math.max(members.length, 1);
    const r = size / 2 - 40;
    const cx = size / 2;
    const cy = size / 2;
    return members.map((m, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        ...m,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
  }, [members, size]);

  const posById = useMemo(() => {
    const m = new Map();
    layout.forEach((p) => m.set(p.id, p));
    return m;
  }, [layout]);

  return (
    <div className="card p-4">
      <div className="subtitle mb-2">{label}</div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={`h-auto w-full ${muted ? 'opacity-60' : ''}`}
      >
        {/* Arrows */}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill={muted ? '#cbd5e1' : '#4F46E5'}
            />
          </marker>
        </defs>

        {transfers.map((t, idx) => {
          const from = posById.get(t.fromUserId);
          const to = posById.get(t.toUserId);
          if (!from || !to) return null;
          // Shrink endpoints so arrow doesn't overlap the circles.
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const shrink = 22;
          const x1 = from.x + (dx / len) * shrink;
          const y1 = from.y + (dy / len) * shrink;
          const x2 = to.x - (dx / len) * shrink;
          const y2 = to.y - (dy / len) * shrink;
          // Curve offset
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const curve = Math.min(40, len / 5);
          const ctrlX = midX + (dy / len) * curve;
          const ctrlY = midY - (dx / len) * curve;
          const stroke = muted ? '#cbd5e1' : '#4F46E5';
          return (
            <g key={idx}>
              <path
                d={`M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={muted ? 1 : 1.5}
                markerEnd="url(#arrow)"
              />
              {!muted && (
                <text
                  x={ctrlX}
                  y={ctrlY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="#4F46E5"
                  className="font-semibold"
                >
                  ₹{(t.amountPaise / 100).toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {layout.map((m) => (
          <g key={m.id}>
            <circle
              cx={m.x}
              cy={m.y}
              r={18}
              fill={muted ? '#f1f5f9' : '#EEF0FF'}
              stroke={muted ? '#e2e8f0' : '#4F46E5'}
              strokeWidth={1}
            />
            <text
              x={m.x}
              y={m.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="700"
              fill={muted ? '#94a3b8' : '#4F46E5'}
            >
              {initials(m.name)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}