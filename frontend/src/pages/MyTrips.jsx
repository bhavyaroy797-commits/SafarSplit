import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Button from '../components/common/Button';
import Pill from '../components/common/Pill';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/Skeleton';
import TripCard from '../components/trips/TripCard';
import NewTripModal from '../components/trips/NewTripModal';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import useReveal from '../hooks/useReveal';
import { fetchTrips } from '../features/trips/tripsSlice';
import { TRIP_TYPES } from '../utils/constants';

export default function MyTrips() {
  const dispatch = useDispatch();
  const toast = useToast();
  const revealRef = useReveal();
  const { isAuthed } = useAuth();
  const { list, status, error } = useSelector((s) => s.trips);
  const [params, setParams] = useSearchParams();
  const [openNew, setOpenNew] = useState(false);

  const filter = params.get('type') || 'all';

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

  const counts = useMemo(() => {
    const c = { all: list.length };
    TRIP_TYPES.forEach((t) => {
      c[t.key] = list.filter(
        (x) => (x.category || '').toLowerCase() === t.key
      ).length;
    });
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    return list.filter((t) => (t.category || '').toLowerCase() === filter);
  }, [list, filter]);

  const setFilter = (key) => {
    if (key === 'all') setParams({});
    else setParams({ type: key });
  };

  return (
    <div ref={revealRef} className="min-h-screen">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="reveal flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Trips
            </h1>
            <div className="subtitle mt-1">
              {filtered.length} trip{filtered.length === 1 ? '' : 's'} available
            </div>
          </div>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpenNew(true)}
          >
            New Trip
          </Button>
        </div>

        <div className="reveal mt-6 flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')}>
            <Pill active={filter === 'all'}>All types</Pill>
          </button>
          {TRIP_TYPES.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}>
              <Pill active={filter === t.key}>
                {t.label} ({counts[t.key] || 0})
              </Pill>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {status === 'loading' ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No trips here yet"
            description="Chalo trip banate hain — start with a destination and dates."
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setOpenNew(true)}
              >
                Create trip
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <div key={t.id} className="reveal">
                <TripCard trip={t} />
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />

      <NewTripModal open={openNew} onClose={() => setOpenNew(false)} />
    </div>
  );
}