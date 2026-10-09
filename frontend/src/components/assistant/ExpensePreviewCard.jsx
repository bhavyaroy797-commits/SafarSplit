import { Check, X, AlertTriangle } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatINR, initials } from '../../utils/format';

export default function ExpensePreviewCard({
  draft,
  onConfirm,
  onUndo,
  saving,
  mode = 'single',
}) {
  if (!draft) return null;

  if (mode === 'multi' && draft.drafts) {
    return (
      <Card className="border-brand-200 p-4">
        <div className="subtitle mb-2">Preview · {draft.drafts.length} expenses</div>
        <ul className="space-y-2">
          {draft.drafts.map((d, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-inner border border-line p-3 text-sm"
            >
              <div>
                <div className="font-semibold text-ink">{d.title}</div>
                <div className="text-xs text-muted">
                  {d.paidByName} · split {d.splitType}
                </div>
              </div>
              <div className="font-bold text-brand-600">
                {formatINR(d.amountPaise)}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Button onClick={onConfirm} loading={saving} leftIcon={<Check className="h-4 w-4" />}>
            Confirm all
          </Button>
          <Button variant="secondary" onClick={onUndo} leftIcon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-brand-200 p-4">
      <div className="subtitle mb-2">Preview · confirm to save</div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">{draft.title}</div>
          <div className="text-xs text-muted">
            Paid by <strong>{draft.paidByName || '—'}</strong> · split{' '}
            {draft.splitType}
          </div>
        </div>
        <div className="text-xl font-extrabold text-brand-600">
          {formatINR(draft.amountPaise)}
        </div>
      </div>

      {draft.preview?.length ? (
        <ul className="mt-3 space-y-1.5">
          {draft.preview.map((p) => (
            <li
              key={p.userId}
              className="flex items-center justify-between rounded-inner border border-line px-3 py-2 text-xs"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-600">
                  {initials(p.name)}
                </span>
                {p.name}
              </span>
              <span className="font-semibold text-brand-600">
                {formatINR(p.sharePaise)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {draft.excludedIds?.length ? (
        <div className="mt-3 flex items-start gap-2 rounded-inner border border-amber-100 bg-amber-50 p-2 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {draft.excludedIds.length} member{draft.excludedIds.length > 1 ? 's' : ''} excluded.
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button onClick={onConfirm} loading={saving} leftIcon={<Check className="h-4 w-4" />}>
          Confirm
        </Button>
        <Button variant="secondary" onClick={onUndo} leftIcon={<X className="h-4 w-4" />}>
          Undo
        </Button>
      </div>
    </Card>
  );
}