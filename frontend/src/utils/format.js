// Indian digit grouping: ₹1,25,000
export function formatINR(paise, { withSymbol = true, decimals = 0 } = {}) {
  if (paise === null || paise === undefined || Number.isNaN(paise)) {
    return withSymbol ? '₹0' : '0';
  }
  const rupees = paise / 100;
  const negative = rupees < 0;
  const abs = Math.abs(rupees);

  const [intPart, decPart] = abs.toFixed(decimals).split('.');
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped =
    rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (rest ? ',' : '') + lastThree;

  const out = decimals > 0 ? `${grouped}.${decPart}` : grouped;
  return `${negative ? '-' : ''}${withSymbol ? '₹' : ''}${out}`;
}

export function formatDateRange(startISO, endISO) {
  if (!startISO) return '';
  const s = new Date(startISO);
  const e = endISO ? new Date(endISO) : null;
  const opts = { day: 'numeric', month: 'short' };
  if (!e) return s.toLocaleDateString('en-IN', opts);
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en-IN', {
      month: 'short',
    })}`;
  }
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString(
    'en-IN',
    { ...opts, year: 'numeric' }
  )}`;
}

export function durationDays(startISO, endISO) {
  if (!startISO || !endISO) return '';
  const s = new Date(startISO);
  const e = new Date(endISO);
  const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  return `${days} day${days > 1 ? 's' : ''}`;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export function rupeesToPaise(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise) {
  return (paise || 0) / 100;
}

export function shortDay(dateISO) {
  if (!dateISO) return '';
  return new Date(dateISO).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}