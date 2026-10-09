import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import { formatINR, initials } from '../../utils/format';

const DIET_STYLES = {
  veg: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    label: 'Veg',
  },
  egg: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
    label: 'Egg',
  },
  non_veg: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-100',
    label: 'Non-veg',
  },
  unknown: {
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    label: 'Unknown',
  },
};

export default function ReceiptReview({
  draft,
  previewUrl,
  onCancel,
  onConfirm,
  saving,
}) {
  const [items, setItems] = useState(() =>
    (draft.items || []).map((it) => ({ ...it, shares: [...(it.shares || [])] }))
  );
  const [title, setTitle] = useState(
    draft.merchant ? `Bill — ${draft.merchant}` : 'Bill'
  );
  const [showWhy, setShowWhy] = useState(null);
  const members = draft.members || [];

  const totals = useMemo(() => {
    const itemSub = new Map();
    members.forEach((m) => itemSub.set(m.id, 0));
    for (const it of items) {
      for (const s of it.shares) {
        itemSub.set(s.userId, (itemSub.get(s.userId) || 0) + s.sharePaise);
      }
    }
    const itemTotal = [...itemSub.values()].reduce((s, v) => s + v, 0);
    const extrasNet =
      (draft.taxesPaise || 0) +
      (draft.serviceChargePaise || 0) +
      (draft.deliveryPaise || 0) -
      (draft.discountPaise || 0);

    const extrasByMember = new Map();
    if (itemTotal > 0 && extrasNet !== 0) {
      const raw = [];
      for (const [uid, sub] of itemSub.entries()) {
        const exact = (sub / itemTotal) * extrasNet;
        raw.push({ uid, floor: Math.trunc(exact), frac: exact - Math.trunc(exact) });
      }
      let remainder = extrasNet - raw.reduce((s, r) => s + r.floor, 0);
      const sorted = [...raw].sort((a, b) =>
        extrasNet >= 0 ? b.frac - a.frac : a.frac - b.frac
      );
      let i = 0;
      while (remainder !== 0 && sorted.length) {
        const step = remainder > 0 ? 1 : -1;
        sorted[i % sorted.length].floor += step;
        remainder -= step;
        i++;
      }
      raw.forEach((r) => extrasByMember.set(r.uid, r.floor));
    } else {
      members.forEach((m) => extrasByMember.set(m.id, 0));
    }

    const memberTotals = members.map((m) => ({
      userId: m.id,
      name: m.name,
      itemsPaise: itemSub.get(m.id) || 0,
      extrasPaise: extrasByMember.get(m.id) || 0,
      totalPaise: (itemSub.get(m.id) || 0) + (extrasByMember.get(m.id) || 0),
    }));

    const itemsSum = items.reduce((s, it) => s + (it.lineTotalPaise || 0), 0);
    const computedTotal =
      itemsSum +
      (draft.taxesPaise || 0) +
      (draft.serviceChargePaise || 0) +
      (draft.deliveryPaise || 0) -
      (draft.discountPaise || 0);

    const printedTotal = draft.totalPaise || 0;
    const mismatch = printedTotal > 0 && Math.abs(printedTotal - computedTotal) > 100;

    return { itemsSum, computedTotal, printedTotal, mismatch, memberTotals };
  }, [items, draft, members]);

  const toggleShare = (itemIdx, userId) => {
    const next = [...items];
    const it = { ...next[itemIdx], shares: [...next[itemIdx].shares] };
    const exists = it.shares.findIndex((s) => s.userId === userId);
    if (exists >= 0) {
      it.shares.splice(exists, 1);
    } else {
      it.shares.push({ userId, sharePaise: 0 });
    }
    const total = it.lineTotalPaise;
    const n = it.shares.length;
    if (n > 0) {
      const base = Math.floor(total / n);
      const rem = total - base * n;
      it.shares = it.shares.map((s, i) => ({
        ...s,
        sharePaise: base + (i < rem ? 1 : 0),
      }));
    }
    next[itemIdx] = it;
    setItems(next);
  };

  const setDiet = (itemIdx, dietClass) => {
    const next = [...items];
    next[itemIdx] = { ...next[itemIdx], dietClass };
    setItems(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Receipt"
            className="h-24 w-24 shrink-0 rounded-inner border border-line object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
            {draft.merchant && <span>{draft.merchant}</span>}
            {draft.date && <span>· {draft.date}</span>}
          </div>
        </div>
      </div>

      {totals.mismatch ? (
        <div className="flex items-start gap-2 rounded-inner border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Totals don't match the printed bill</div>
            <div>
              Computed {formatINR(totals.computedTotal)} vs printed{' '}
              {formatINR(totals.printedTotal)}. Double-check before saving.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-inner border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Totals check out.
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-canvas px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Items · tap a chip to reassign
        </div>
        <ul className="divide-y divide-line">
          {items.map((it, idx) => {
            const ds = DIET_STYLES[it.dietClass] || DIET_STYLES.unknown;
            return (
              <li key={it.tempId || idx} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${ds.dot}`} />
                    <span className="text-sm font-semibold text-ink">{it.name}</span>
                    <span className="text-xs text-muted">× {it.qty}</span>
                    <button
                      onClick={() => setShowWhy(showWhy === idx ? null : idx)}
                      className="rounded-full p-1 text-muted hover:text-brand-600"
                      aria-label="Why this assignment?"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-brand-600">
                      {formatINR(it.lineTotalPaise)}
                    </span>
                    <span
                      className={`rounded-pill border px-2 py-0.5 text-[10px] font-semibold uppercase ${ds.badge}`}
                    >
                      {ds.label}
                    </span>
                  </div>
                </div>

                {showWhy === idx && (
                  <div className="mt-2 rounded-inner border border-brand-100 bg-brand-50/50 p-2 text-xs text-brand-800">
                    {it.explanation || 'No explanation available.'}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={it.dietClass}
                    onChange={(e) => setDiet(idx, e.target.value)}
                    className="rounded-pill border border-line bg-white px-2 py-1 text-[11px]"
                  >
                    <option value="veg">Veg</option>
                    <option value="egg">Egg</option>
                    <option value="non_veg">Non-veg</option>
                    <option value="unknown">Unknown</option>
                  </select>

                  {members.map((m) => {
                    const on = it.shares.some((s) => s.userId === m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleShare(idx, m.id)}
                        className={`inline-flex items-center gap-1 rounded-pill border px-2 py-1 text-[11px] font-medium ${
                          on
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-line bg-white text-muted hover:border-brand-300'
                        }`}
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[8px] font-bold text-white">
                          {initials(m.name)}
                        </span>
                        {m.name.split(' ')[0]}
                        {on && (
                          <span className="ml-1 text-brand-600">
                            {formatINR(
                              it.shares.find((s) => s.userId === m.id)?.sharePaise || 0
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {it.needsManual && (
                  <div className="mt-2 text-[11px] text-amber-700">
                    Nobody matched — assign manually above.
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="subtitle mb-2">Bill total</div>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">Items</span>
              <span>{formatINR(totals.itemsSum)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Taxes</span>
              <span>{formatINR(draft.taxesPaise || 0)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Service</span>
              <span>{formatINR(draft.serviceChargePaise || 0)}</span>
            </li>
            {!!draft.discountPaise && (
              <li className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>−{formatINR(draft.discountPaise)}</span>
              </li>
            )}
            <li className="mt-2 flex justify-between border-t border-line pt-2 font-bold">
              <span>Computed</span>
              <span>{formatINR(totals.computedTotal)}</span>
            </li>
          </ul>
        </Card>

        <Card className="p-4">
          <div className="subtitle mb-2">Per-person totals</div>
          <ul className="space-y-1 text-sm">
            {totals.memberTotals.map((t) => (
              <li key={t.userId} className="flex justify-between">
                <span className="text-muted">{t.name}</span>
                <span className="font-semibold text-brand-600">
                  {formatINR(t.totalPaise)}
                </span>
              </li>
            ))}
            <li className="mt-2 flex justify-between border-t border-line pt-2 font-bold">
              <span>Sum</span>
              <span>
                {formatINR(totals.memberTotals.reduce((s, t) => s + t.totalPaise, 0))}
              </span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onConfirm({
              ...draft,
              title,
              items,
              previewMemberTotals: totals.memberTotals,
            })
          }
          loading={saving}
        >
          Confirm & split
        </Button>
      </div>
    </div>
  );
}