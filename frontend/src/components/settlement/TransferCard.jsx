import { useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatINR, initials } from '../../utils/format';
import useToast from '../../hooks/useToast';

export default function TransferCard({ transfer, onPaid, tripId, disabled }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyUpiLink = async () => {
    if (!transfer.upiLink) return;
    try {
      await navigator.clipboard.writeText(transfer.upiLink);
      setCopied(true);
      toast.success('UPI link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      await onPaid?.(transfer);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5" spatial>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
            {initials(transfer.fromName)}
          </div>
          <div className="text-sm">
            <div className="font-semibold text-ink">{transfer.fromName}</div>
            <div className="text-xs text-muted">pays</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
              {initials(transfer.toName)}
            </div>
            <div className="text-sm">
              <div className="font-semibold text-ink">{transfer.toName}</div>
              <div className="text-xs text-muted">receives</div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted">Amount</div>
          <div className="text-xl font-extrabold text-brand-600">
            {formatINR(transfer.amountPaise)}
          </div>
        </div>
      </div>

      {transfer.explanation && (
        <p className="mt-3 rounded-inner border border-brand-100 bg-brand-50/50 px-3 py-2 text-xs text-brand-800">
          {transfer.explanation}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {transfer.upiLink ? (
          <a href={transfer.upiLink}>
            <Button
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Pay via UPI
            </Button>
          </a>
        ) : (
          <span className="text-xs text-muted">
            {transfer.toName} hasn't added a UPI id yet
          </span>
        )}

        {transfer.upiLink && (
          <Button
            size="sm"
            variant="secondary"
            onClick={copyUpiLink}
            leftIcon={<Copy className="h-3.5 w-3.5" />}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        )}

        <Button
          size="sm"
          variant="subtle"
          onClick={markPaid}
          loading={busy}
          disabled={disabled}
          leftIcon={<Check className="h-3.5 w-3.5" />}
        >
          Mark paid
        </Button>
      </div>
    </Card>
  );
}