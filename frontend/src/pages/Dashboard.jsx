import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Wallet, Plane, Receipt, ArrowRight } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import { SkeletonCard } from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import NewTripModal from '../components/trips/NewTripModal';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import useReveal from '../hooks/useReveal';
import { formatINR, timeAgo } from '../utils/format';
import { fetchTrips } from '../features/trips/tripsSlice';
import { TRIP_TYPES } from '../utils/constants';

export default function Dashboard() {
  const { user, isAuthed } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const revealRef = useReveal();
  const { list, status, error } = useSelector((s) => s.trips);

  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    if (isAuthed) {
      dispatch(fetchTrips()).catch((err) =>
        toast.error(err.message || 'Failed to load trips')
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isAuthed]);

  useEffect(() => {
    if (error) toast.error(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Stats come from real trip data. Total spent uses BUDGET PER PERSON × members,
  // because the actual expenses live per-trip and aren't loaded on this page.
  const stats = useMemo(() => {
    const totalTrips = list.length;

    // "Pending" = any trip that isn't completed/cancelled.
    const pendingSettlements = list.filter(
      (t) => !['completed', 'cancelled'].includes(t.status)
    ).length;

    // Total budget across trips (per-person budget × member count when available).
    const totalSpentPaise = list.reduce((sum, t) => {
      const perPerson = Number(t.budget_paise || 0);
      const members = Number(t.member_count || 1);
      return sum + perPerson * members;
    }, 0);

    return { totalTrips, pendingSettlements, totalSpentPaise };
  }, [list]);

  const typeCounts = useMemo(() => {
    const m = {};
    TRIP_TYPES.forEach((t) => (m[t.key] = 0));
    list.forEach((t) => {
      const key = (t.category || '').toLowerCase();
      if (m[key] !== undefined) m[key] += 1;
    });
    return m;
  }, [list]);

  const recentExpenses = useMemo(
    () =>
      list.slice(0, 4).map((t) => ({
        id: t.id,
        tripId: t.id,
        title: t.title || 'Trip',
        trip: t.destination,
        amount_paise: Number(t.budget_paise || 0),
        status: ['completed', 'cancelled'].includes(t.status) ? 'settled' : 'pending',
        when: t.created_at || new Date().toISOString(),
      })),
    [list]
  );

  return (
    <div ref={revealRef} className="min-h-screen">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="reveal flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Dashboard
            </h1>
            <div className="subtitle mt-1">
              Overview of your trips{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </div>
          </div>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpenNew(true)}
          >
            New Trip
          </Button>
        </div>

        <div className="reveal mt-6 grid gap-5 md:grid-cols-3">
          <StatCard icon={Plane} label="Total trips" value={stats.totalTrips} />
          <StatCard
            icon={Wallet}
            label="Pending settlements"
            value={stats.pendingSettlements}
          />
          <StatCard
            icon={Receipt}
            label="Total budget"
            value={formatINR(stats.totalSpentPaise)}
          />
        </div>

        <div className="reveal mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TRIP_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(`/trips?type=${t.key}`)}
              className="card flex items-center justify-between p-4 text-left transition hover:border-brand-300"
            >
              <div className="text-xs font-medium text-muted">{t.label}</div>
              <div className="text-lg font-extrabold text-ink">
                {typeCounts[t.key] || 0}
              </div>
            </button>
          ))}
        </div>

        <div className="reveal mt-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="subtitle">Recent expenses</div>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink">
                Latest activity
              </h2>
            </div>
            <Link
              to="/expenses"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {status === 'loading' && isAuthed ? (
            <SkeletonCard />
          ) : recentExpenses.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="Create a trip to get started."
              action={<Button onClick={() => setOpenNew(true)}>Create trip</Button>}
            />
          ) : (
            <Card className="divide-y divide-line">
              {recentExpenses.map((e) => (
                <Link
                  key={e.id}
                  to={`/trips/${e.tripId}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-canvas"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {e.title}
                    </div>
                    <div className="text-xs text-muted">
                      {e.trip} · {timeAgo(e.when)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-600">
                      {formatINR(e.amount_paise)}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </div>
      </section>

      <Footer />

      <NewTripModal open={openNew} onClose={() => setOpenNew(false)} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-4 p-5" spatial>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-extrabold tracking-tight text-ink">
          {value}
        </div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </Card>
  );
}