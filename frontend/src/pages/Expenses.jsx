import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/Skeleton';
import useToast from '../hooks/useToast';
import useReveal from '../hooks/useReveal';
import { formatINR, shortDay } from '../utils/format';
import { fetchTrips } from '../features/trips/tripsSlice';

// Local-only toggle state on top of real data — statuses are UI-only for now.
export default function Expenses() {
  const dispatch = useDispatch();
  const toast = useToast();
  const revealRef = useReveal();
  const { list: trips, status } = useSelector((s) => s.trips);
  const [tweaks, setTweaks] = useState({}); // { [tripId]: 'settled'|'pending' }
  const [hidden, setHidden] = useState({}); // { [tripId]: true }

  useEffect(() => {
    dispatch(fetchTrips()).catch((err) =>
      toast.error(err.message || 'Failed to load expenses')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const rows = useMemo(
    () =>
      trips
        .filter((t) => !hidden[t.id])
        .map((t) => ({
          id: t.id,
          tripId: t.id,
          payer: t.owner_name || 'Owner',
          title: t.title || 'Trip',
          trip: t.destination,
          people: t.member_count || 1,
          date: t.start_date,
          amount_paise: t.budget_paise || t.budget_per_person_paise || 0,
          status: tweaks[t.id] || (t.status === 'completed' ? 'settled' : 'pending'),
        })),
    [trips, tweaks, hidden]
  );

  return (
    <div ref={revealRef} className="min-h-screen">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="reveal">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Expenses
          </h1>
          <div className="subtitle mt-1">{rows.length} records</div>
        </div>

        <div className="reveal mt-6 space-y-3">
          {status === 'loading' ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No expenses yet"
              description="Add your first expense from a trip workspace."
            />
          ) : (
            rows.map((e) => (
              <Card key={e.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/trips/${e.tripId}`}
                    className="text-sm font-bold text-ink hover:text-brand-600"
                  >
                    {e.payer}
                    <span className="ml-2 font-medium text-muted">
                      · {e.title}
                    </span>
                  </Link>
                  <div className="mt-0.5 text-xs text-muted">
                    {e.trip} · {e.people} people · {shortDay(e.date)}
                  </div>
                </div>
                <div className="text-sm font-bold text-brand-600">
                  {formatINR(e.amount_paise)}
                </div>
                <button
                  onClick={() =>
                    setTweaks((t) => ({
                      ...t,
                      [e.tripId]:
                        (t[e.tripId] || e.status) === 'settled'
                          ? 'pending'
                          : 'settled',
                    }))
                  }
                >
                  <StatusBadge
                    status={tweaks[e.tripId] || e.status}
                  />
                </button>
                <button
                  onClick={() =>
                    setHidden((h) => ({ ...h, [e.tripId]: true }))
                  }
                  className="rounded-full border border-line bg-white p-2 text-muted hover:border-red-200 hover:text-red-500"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Card>
            ))
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}