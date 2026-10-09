import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import DebtGraph from './DebtGraph';
import TransferCard from './TransferCard';
import { settlementApi } from '../../services/api';
import { fetchSettleUp, fetchBalances } from '../../features/expenses/expensesSlice';
import useToast from '../../hooks/useToast';
import { formatINR } from '../../utils/format';

export default function SettleUpScreen({ tripId, members = [] }) {
  const dispatch = useDispatch();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await settlementApi.get(tripId);
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Could not compute settlement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const markPaid = async (transfer) => {
    try {
      await settlementApi.markPaid(tripId, {
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
        amountPaise: transfer.amountPaise,
        method: 'upi',
      });
      toast.success('Marked as paid');
      // Refresh both this screen and the shared expenses slice.
      await load(true);
      dispatch(fetchSettleUp(tripId));
      dispatch(fetchBalances(tripId));
    } catch (err) {
      toast.error(err.message || 'Could not mark as paid');
    }
  };

  const totals = useMemo(() => {
    if (!data) return null;
    const total = data.transfers.reduce((s, t) => s + t.amountPaise, 0);
    return { total, count: data.transfers.length };
  }, [data]);

  if (loading) {
    return (
      <Card className="p-6 text-sm text-muted">Computing settlement…</Card>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Could not load settlement"
        description="Try refreshing in a moment."
        action={<Button onClick={() => load()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Headline banner */}
      <Card className="p-5" spatial>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="subtitle">Hisaab</div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {data.allSettled
                ? 'Sab settle! 🎉'
                : `${data.stats.naivePayments} possible payments → ${data.stats.optimizedPayments} optimized`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {data.allSettled
                ? 'Nobody owes anybody. Enjoy the trip memories.'
                : `Total outstanding: ${formatINR(totals.total)} · method: ${data.method}`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            loading={refreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Debt graphs */}
      {!data.allSettled && (
        <div className="grid gap-4 md:grid-cols-2">
          <DebtGraph
            label="Before — every possible payment"
            members={members.length ? members : data.balances.map((b) => ({ id: b.userId, name: b.name }))}
            transfers={data.naivePairs}
            muted
          />
          <DebtGraph
            label="After — the fewest payments needed"
            members={members.length ? members : data.balances.map((b) => ({ id: b.userId, name: b.name }))}
            transfers={data.transfers}
          />
        </div>
      )}

      {/* Balances */}
      {data.balances?.length ? (
        <Card className="p-5">
          <div className="subtitle mb-3">Balances</div>
          <ul className="divide-y divide-line">
            {data.balances.map((b) => {
              const positive = b.netPaise > 0;
              return (
                <li
                  key={b.userId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>{b.name || 'Member'}</span>
                  <span className={positive ? 'text-emerald-600' : 'text-red-500'}>
                    {positive ? 'gets ' : 'owes '}
                    {formatINR(Math.abs(b.netPaise))}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {/* Transfers */}
      {data.allSettled ? (
        <Card className="flex items-center gap-3 p-6 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          All settled.
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="subtitle">Payments</div>
          {data.transfers.map((t, i) => (
            <TransferCard
              key={i}
              transfer={t}
              tripId={tripId}
              onPaid={markPaid}
            />
          ))}
        </div>
      )}
    </div>
  );
}