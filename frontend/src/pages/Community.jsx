import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  MapPin,
  Clock,
  GitFork,
  Sparkles,
  Filter,
} from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Pill from '../components/common/Pill';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/Skeleton';
import TripCover from '../components/trips/TripCover';
import { communityApi } from '../services/api';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import useReveal from '../hooks/useReveal';
import { formatINR, formatDateRange } from '../utils/format';
import { TRIP_TYPES } from '../utils/constants';

export default function Community() {
  const navigate = useNavigate();
  const toast = useToast();
  const revealRef = useReveal();
  const { isAuthed } = useAuth();

  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [tagFilter, setTagFilter] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(null);

  const fetchCommunity = async (opts = {}) => {
    const targetPage = opts.page ?? page;
    setLoading(true);
    try {
      const res = await communityApi.list({
        q: q.trim() || undefined,
        tags: tagFilter || undefined,
        sort,
        page: targetPage,
        limit: 12,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      toast.error(err.message || 'Could not load community trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunity({ page: 1 });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, tagFilter]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCommunity({ page: 1 });
  };

  const openFork = (trip) => {
    if (!isAuthed) {
      toast.warn('Please log in to fork this trip');
      navigate('/login');
      return;
    }
    setForking(trip);
  };

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div ref={revealRef} className="min-h-screen">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="reveal flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="subtitle">Community</div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Trips shared by others
            </h1>
            <p className="mt-1 text-sm text-muted">
              Fork one as a starting point — dates shift to your schedule.
            </p>
          </div>

          <form onSubmit={onSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search destinations…"
                className="input h-10 w-64 pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>

        <div className="reveal mt-6 flex flex-wrap gap-2">
          <Pill active={sort === 'newest'} className="cursor-pointer">
            <button onClick={() => setSort('newest')}>Newest</button>
          </Pill>
          <Pill active={sort === 'most_forked'} className="cursor-pointer">
            <button onClick={() => setSort('most_forked')}>Most forked</button>
          </Pill>
          <span className="mx-1 h-6 w-px bg-line" />
          <button onClick={() => setTagFilter('')}>
            <Pill active={tagFilter === ''}>All tags</Pill>
          </button>
          {['mountain', 'beach', 'cultural', 'food', 'winter'].map((t) => (
            <button key={t} onClick={() => setTagFilter(t)}>
              <Pill active={tagFilter === t}>{t}</Pill>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No public trips yet"
            description="Complete a trip and publish it to share it with the community."
            action={
              <Button onClick={() => navigate('/trips')}>Go to my trips</Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <div key={t.trip_id} className="reveal">
                  <CommunityTripCard trip={t} onFork={() => openFork(t)} />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => {
                    const p = page - 1;
                    setPage(p);
                    fetchCommunity({ page: p });
                  }}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const p = page + 1;
                    setPage(p);
                    fetchCommunity({ page: p });
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />

      <ForkModal
        trip={forking}
        onClose={() => setForking(null)}
        onForked={(newTrip) => {
          setForking(null);
          navigate(`/trips/${newTrip.id}`);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trip card                                                          */
/* ------------------------------------------------------------------ */

function CommunityTripCard({ trip, onFork }) {
  return (
    <Card className="overflow-hidden p-0 transition hover:border-brand-300">
      <div className="relative">
        <TripCover
          destination={trip.destination}
          overlay
          rounded="rounded-none"
          className="h-44 w-full"
        >
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-pill bg-white/95 px-3 py-1 text-[11px] font-semibold text-ink backdrop-blur">
              {trip.days} day{trip.days > 1 ? 's' : ''}
            </span>
            {trip.fork_count > 0 && (
              <span className="rounded-pill bg-brand-500/95 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                <GitFork className="mr-1 inline h-3 w-3" />
                {trip.fork_count}
              </span>
            )}
          </div>
        </TripCover>
      </div>

      <div className="space-y-2 p-4">
        <div className="line-clamp-1 text-sm font-bold text-ink">
          {trip.title}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5 text-brand-500" />
          {trip.destination}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {trip.budget_paise ? (
            <span className="font-semibold text-brand-600">
              {formatINR(trip.budget_paise)} / person
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {trip.itinerary_item_count || 0} stops
          </span>
        </div>
        {trip.tags?.length ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {trip.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-pill border border-line bg-white px-2 py-0.5 text-[10px] font-medium text-muted"
              >
                #{t}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-2 text-[11px] text-muted">
          <span>by {trip.owner_display_name || 'Traveller'}</span>
          <button
            onClick={onFork}
            className="rounded-pill bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
          >
            <GitFork className="mr-1 inline h-3 w-3" />
            Fork
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Fork modal                                                         */
/* ------------------------------------------------------------------ */

function ForkModal({ trip, onClose, onForked }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    startDate: '',
    budget: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (trip) {
      setForm({
        title: trip.title ? `${trip.title} (my copy)` : 'My trip',
        startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        budget: trip.budget_paise ? String(Math.round(trip.budget_paise / 100)) : '',
      });
    }
  }, [trip]);

  if (!trip) return null;

  const save = async () => {
    if (!form.title || !form.startDate) {
      toast.warn('Title and start date are required');
      return;
    }
    setBusy(true);
    try {
      const newTrip = await communityApi.fork(trip.trip_id, {
        title: form.title,
        startDate: form.startDate,
        budgetPaise: form.budget ? Math.round(Number(form.budget) * 100) : undefined,
      });
      toast.success('Forked! Yours to customise.');
      onForked?.(newTrip);
    } catch (err) {
      toast.error(err.message || 'Could not fork this trip');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Fork this trip"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} leftIcon={<GitFork className="h-4 w-4" />}>
            Fork
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        We'll copy the itinerary of <strong>{trip.title}</strong> into a new trip
        you own. Dates will shift to your start date, and all stops reset to{' '}
        <em>proposed</em> so your group can vote again.
      </p>
      <div className="space-y-3">
        <Input
          label="New trip title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <Input
            label="Budget / person (₹, optional)"
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}