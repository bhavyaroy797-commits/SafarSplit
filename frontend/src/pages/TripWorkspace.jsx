import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Pencil,
  Users,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Copy,
  Upload,
  Wallet as WalletIcon,
  Receipt,
  FileText,
  Map as MapIcon,
  Vote as VoteIcon,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
  Camera,
} from 'lucide-react';

import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Pill from '../components/common/Pill';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import TripCover from '../components/trips/TripCover';
import { SkeletonCard } from '../components/common/Skeleton';
import ScanBillModal from '../components/receipts/ScanBillModal';
import SettleUpScreen from '../components/settlement/SettleUpScreen';
import AssistantChat from '../components/assistant/AssistantChat';

import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import useSocket from '../hooks/useSocket';
import {
  formatINR,
  rupeesToPaise,
  durationDays,
  formatDateRange,
  initials,
} from '../utils/format';
import { DIET_OPTIONS } from '../utils/constants';

import { fetchTrip } from '../features/trips/tripsSlice';
import {
  fetchItinerary,
  createItem,
  deleteItem,
  reorderItems,
  castVote,
  removeVote,
  generateWithAI,
  clearAI,
} from '../features/itinerary/itinerarySlice';
import {
  fetchExpenses,
  createExpense,
  deleteExpense,
  fetchBalances,
  fetchSettleUp,
  parseExpenseText,
  clearParsed,
} from '../features/expenses/expensesSlice';
import {
  fetchWallet,
  fetchTransactions,
  topUpWallet,
  transferWallet,
} from '../features/wallet/walletSlice';
import { attachmentsApi } from '../services/api';

const TABS = [
  { key: 'itinerary', label: 'Itinerary', icon: CalendarDays },
  { key: 'map', label: 'Map', icon: MapIcon },
  { key: 'votes', label: 'Votes', icon: VoteIcon },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'wallet', label: 'Wallet', icon: WalletIcon },
  { key: 'files', label: 'Files', icon: FileText },
  { key: 'members', label: 'Members', icon: Users },
];

export default function TripWorkspace() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { user } = useAuth();

  const trip = useSelector((s) => s.trips.current);
  const tripStatus = useSelector((s) => s.trips.status);
  const tripError = useSelector((s) => s.trips.error);
  const itinerary = useSelector((s) => s.itinerary.items);
  const itStatus = useSelector((s) => s.itinerary.status);
  const expenses = useSelector((s) => s.expenses.items);
  const balances = useSelector((s) => s.expenses.balances);
  const settleUp = useSelector((s) => s.expenses.settleUp);
  const wallet = useSelector((s) => s.wallet.wallet);
  const txs = useSelector((s) => s.wallet.transactions);

  const [tab, setTab] = useState('itinerary');

  useSocket(tripId);

  useEffect(() => {
    dispatch(fetchTrip(tripId)).catch((err) =>
      toast.error(err.message || 'Trip not found')
    );
    dispatch(fetchItinerary(tripId)).catch(() => {});
    dispatch(fetchExpenses(tripId)).catch(() => {});
    dispatch(fetchBalances(tripId)).catch(() => {});
    dispatch(fetchSettleUp(tripId)).catch(() => {});
    dispatch(fetchWallet()).catch(() => {});
    dispatch(fetchTransactions(25)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, tripId]);

  useEffect(() => {
    if (tripError) toast.error(tripError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripError]);

  const days = useMemo(() => {
    const map = new Map();
    itinerary.forEach((i) => {
      if (!map.has(i.day_number)) map.set(i.day_number, []);
      map.get(i.day_number).push(i);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [itinerary]);

  if (tripStatus === 'loading' && !trip) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <SkeletonCard />
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <EmptyState
            title="Trip not found"
            description="Yeh trip exist nahi karti, ya aap member nahi hain."
            action={
              <Button onClick={() => navigate('/trips')}>Back to trips</Button>
            }
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            to="/trips"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to trips
          </Link>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="h-3.5 w-3.5" />}
          >
            Edit
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Pill>{trip.category || 'Trip'}</Pill>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {trip.title || 'Untitled trip'}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-brand-500" />
              {trip.destination || '—'}
            </span>
            {trip.start_date && trip.end_date && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {durationDays(trip.start_date, trip.end_date)} ·{' '}
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-400" />
              4.7
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <TripCover
          destination={trip.destination || ''}
          overlay
          className="h-64 w-full md:h-80"
        />
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}>
                <Pill active={tab === t.key}>
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </Pill>
              </button>
            ))}
          </div>

          {tab === 'itinerary' && (
            <ItineraryTab tripId={tripId} days={days} status={itStatus} />
          )}
          {tab === 'map' && <MapTab days={days} />}
          {tab === 'votes' && <VotesTab tripId={tripId} items={itinerary} />}
          {tab === 'expenses' && (
            <ExpensesTab
              tripId={tripId}
              expenses={expenses}
              balances={balances}
              settleUp={settleUp}
              members={trip.members || []}
            />
          )}
          {tab === 'wallet' && (
            <WalletTab
              wallet={wallet}
              txs={txs}
              members={trip.members || []}
            />
          )}
          {tab === 'files' && <FilesTab tripId={tripId} />}
          {tab === 'members' && <MembersTab trip={trip} />}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <QuickPanel trip={trip} tripId={tripId} />
          <HighlightsCard />
        </aside>
      </section>

      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Right-side sticky cards                                        */
/* -------------------------------------------------------------- */

function QuickPanel({ trip, tripId }) {
  const toast = useToast();
  const dispatch = useDispatch();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setBusy(true);
    try {
      const amountPaise = rupeesToPaise(amount);
      await dispatch(
        createExpense({
          tripId,
          payload: {
            title: note || 'Quick expense',
            amountPaise,
            splitType: 'equal',
            includedUserIds: (trip?.members || []).map((m) => m.user_id),
          },
        })
      ).unwrap();
      toast.success('Expense added');
      setAmount('');
      setNote('');
    } catch (err) {
      toast.error(err.message || 'Could not add expense');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6" spatial>
      <div className="text-xs font-medium text-muted">Quick add expense</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-brand-600">
        {formatINR(trip?.budget_paise || 0)}
        <span className="ml-1 text-xs font-medium text-muted">budget</span>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input
          label="Amount (₹)"
          placeholder="500"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="What was it for?"
          placeholder="Dinner at Britto's"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={busy}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add expense
        </Button>
      </form>
    </Card>
  );
}

function HighlightsCard() {
  const items = [
    'Minimum UPI payments',
    'Live voting on stops',
    'Hinglish expense parsing',
    'Scan bill — diet-aware split',
  ];
  return (
    <Card className="p-6">
      <div className="subtitle mb-3">Trip highlights</div>
      <ul className="space-y-2 text-sm text-ink">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              ✓
            </span>
            {i}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* -------------------------------------------------------------- */
/* Itinerary tab                                                  */
/* -------------------------------------------------------------- */

function ItineraryTab({ tripId, days, status }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const aiStatus = useSelector((s) => s.itinerary.aiStatus);
  const aiError = useSelector((s) => s.itinerary.aiError);
  const lastGenerated = useSelector((s) => s.itinerary.lastGenerated);

  const [showAI, setShowAI] = useState(false);
  const [aiForm, setAiForm] = useState({
    destination: '',
    days: 3,
    groupSize: 4,
    budget: 8000,
    interests: 'beaches, forts, food',
    foodPreference: 'any',
  });

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    day: 1,
    title: '',
    place: '',
    time: '',
    cost: '',
  });

  const runAI = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        generateWithAI({
          tripId,
          params: {
            destination: aiForm.destination || 'Goa',
            days: Number(aiForm.days) || 3,
            groupSize: Number(aiForm.groupSize) || 4,
            budgetPerPersonPaise: rupeesToPaise(aiForm.budget || 0),
            interests: aiForm.interests
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            foodPreference: aiForm.foodPreference,
          },
        })
      ).unwrap();
      toast.success('Itinerary drafted — save the stops you like.');
    } catch (err) {
      toast.error(err.message || 'AI generation failed');
    }
  };

  const addItem = async () => {
    if (!draft.title) return;
    try {
      await dispatch(
        createItem({
          tripId,
          payload: {
            dayNumber: Number(draft.day) || 1,
            title: draft.title,
            place: draft.place || null,
            startTime: draft.time || null,
            costEstimatePaise: draft.cost ? rupeesToPaise(draft.cost) : null,
          },
        })
      ).unwrap();
      setDraft({ day: draft.day, title: '', place: '', time: '', cost: '' });
      setAdding(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const move = async (dayNumber, items, idx, dir) => {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    try {
      await dispatch(
        reorderItems({
          tripId,
          orderedItemIds: next.map((i) => i.id),
          dayNumber,
        })
      ).unwrap();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ink">Plan with AI</div>
            <p className="text-xs text-muted">
              Generate a day-wise itinerary using your local model.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={() => setShowAI((v) => !v)}
          >
            {showAI ? 'Hide' : 'Generate with AI'}
          </Button>
        </div>

        {showAI && (
          <form onSubmit={runAI} className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              label="Destination"
              value={aiForm.destination}
              onChange={(e) =>
                setAiForm({ ...aiForm, destination: e.target.value })
              }
              placeholder="Goa"
            />
            <Input
              label="Days"
              type="number"
              min="1"
              max="30"
              value={aiForm.days}
              onChange={(e) => setAiForm({ ...aiForm, days: e.target.value })}
            />
            <Input
              label="Group size"
              type="number"
              min="1"
              value={aiForm.groupSize}
              onChange={(e) =>
                setAiForm({ ...aiForm, groupSize: e.target.value })
              }
            />
            <Input
              label="Budget per person (₹)"
              type="number"
              min="0"
              value={aiForm.budget}
              onChange={(e) => setAiForm({ ...aiForm, budget: e.target.value })}
            />
            <Input
              label="Interests (comma separated)"
              value={aiForm.interests}
              onChange={(e) =>
                setAiForm({ ...aiForm, interests: e.target.value })
              }
              className="md:col-span-2"
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink">
                Food preference
              </label>
              <select
                className="input"
                value={aiForm.foodPreference}
                onChange={(e) =>
                  setAiForm({ ...aiForm, foodPreference: e.target.value })
                }
              >
                {DIET_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button
                type="submit"
                leftIcon={<Sparkles className="h-4 w-4" />}
                loading={aiStatus === 'loading'}
              >
                Generate
              </Button>
              {lastGenerated && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => dispatch(clearAI())}
                >
                  Clear preview
                </Button>
              )}
            </div>
            {aiError && (
              <div className="md:col-span-2 rounded-inner border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                {aiError}
              </div>
            )}
          </form>
        )}

        {lastGenerated && <AIPreview data={lastGenerated} tripId={tripId} />}
      </Card>

      {status === 'loading' ? (
        <Card className="p-6 text-sm text-muted">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading
          itinerary…
        </Card>
      ) : days.length === 0 ? (
        <EmptyState
          title="No stops yet"
          description="Add your first stop or let AI draft the plan."
          action={
            <Button
              onClick={() => setAdding(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add a stop
            </Button>
          }
        />
      ) : (
        days.map(([dayNumber, items]) => (
          <Card key={dayNumber} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="subtitle">Day {dayNumber}</div>
                <div className="text-sm font-semibold text-ink">
                  {items.length} stop{items.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <ul className="space-y-3">
              {items.map((it, idx) => (
                <li
                  key={it.id}
                  className="flex items-start gap-3 rounded-inner border border-line p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-inner bg-brand-50 text-xs font-bold text-brand-600">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">
                        {it.title}
                      </span>
                      <StatusBadge status={it.status || 'proposed'} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {it.place && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {it.place}
                        </span>
                      )}
                      {it.start_time && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {it.start_time}
                        </span>
                      )}
                      {it.cost_estimate_paise ? (
                        <span className="font-semibold text-brand-600">
                          {formatINR(it.cost_estimate_paise)}
                        </span>
                      ) : null}
                    </div>
                    {it.notes && (
                      <p className="mt-1 text-xs text-muted">{it.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => move(dayNumber, items, idx, -1)}
                      className="rounded-md p-1 text-muted hover:bg-canvas hover:text-ink"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(dayNumber, items, idx, 1)}
                      className="rounded-md p-1 text-muted hover:bg-canvas hover:text-ink"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => dispatch(deleteItem({ itemId: it.id }))}
                    className="rounded-md p-1 text-muted hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      {adding ? (
        <Card className="p-5">
          <div className="subtitle mb-3">New stop</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Day"
              type="number"
              min="1"
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: e.target.value })}
            />
            <Input
              label="Start time (HH:MM)"
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              placeholder="10:00"
            />
            <Input
              label="Title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="md:col-span-2"
            />
            <Input
              label="Place"
              value={draft.place}
              onChange={(e) => setDraft({ ...draft, place: e.target.value })}
            />
            <Input
              label="Cost estimate (₹)"
              inputMode="decimal"
              value={draft.cost}
              onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={addItem}>Save</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          variant="secondary"
          onClick={() => setAdding(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add a stop
        </Button>
      )}
    </div>
  );
}

function AIPreview({ data, tripId }) {
  const dispatch = useDispatch();
  const toast = useToast();
  if (!data?.days?.length) return null;

  const saveDay = async (day) => {
    try {
      for (let i = 0; i < day.items.length; i++) {
        const item = day.items[i];
        await dispatch(
          createItem({
            tripId,
            payload: {
              dayNumber: day.dayNumber,
              title: item.title,
              place: item.place || null,
              startTime: item.startTime || null,
              costEstimatePaise: item.costEstimateInr
                ? rupeesToPaise(item.costEstimateInr)
                : null,
              notes: item.notes || null,
              position: i,
              source: 'ai',
            },
          })
        ).unwrap();
      }
      toast.success(`Day ${day.dayNumber} saved`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="subtitle">AI preview</div>
      {data.days.map((day) => (
        <div
          key={day.dayNumber}
          className="rounded-inner border border-brand-100 bg-brand-50/40 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">
              Day {day.dayNumber} · {day.theme}
            </div>
            <Button size="sm" variant="subtle" onClick={() => saveDay(day)}>
              Save day
            </Button>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-ink">
            {day.items?.map((it, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-500">•</span>
                <span>
                  <strong>{it.title}</strong>
                  {it.place ? ` · ${it.place}` : ''}
                  {it.costEstimateInr ? ` · ₹${it.costEstimateInr}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {data.tips?.length ? (
        <div className="rounded-inner border border-line bg-white p-3 text-xs text-muted">
          <strong className="text-ink">Tips:</strong> {data.tips.join(' · ')}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Map tab                                                        */
/* -------------------------------------------------------------- */

function MapTab({ days }) {
  const [MapLibs, setLibs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import('react-leaflet'), import('leaflet')]).then(
      ([RL, L]) => {
        if (cancelled) return;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setLibs(RL);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const allPoints = useMemo(
    () =>
      days
        .flatMap(([d, items]) =>
          items
            .filter((i) => i.latitude && i.longitude)
            .map((i) => ({ day: d, ...i }))
        )
        .filter(
          (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
        ),
    [days]
  );

  if (!allPoints.length) {
    return (
      <EmptyState
        title="No locations yet"
        description="Add latitude and longitude to your stops to see them on the map."
      />
    );
  }

  if (!MapLibs) {
    return (
      <Card className="flex h-[420px] items-center justify-center p-6 text-sm text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
      </Card>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = MapLibs;
  const center = [allPoints[0].latitude, allPoints[0].longitude];

  const byDay = allPoints.reduce((acc, p) => {
    (acc[p.day] = acc[p.day] || []).push(p);
    return acc;
  }, {});

  return (
    <Card className="overflow-hidden p-2">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: 440, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Object.entries(byDay).map(([day, pts]) =>
          pts.length > 1 ? (
            <Polyline
              key={day}
              positions={pts.map((p) => [p.latitude, p.longitude])}
              pathOptions={{ color: '#4F46E5', weight: 4, opacity: 0.8 }}
            />
          ) : null
        )}
        {allPoints.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <strong>
                Day {p.day} · {p.title}
              </strong>
              {p.place ? <div>{p.place}</div> : null}
              {p.start_time ? <div>{p.start_time}</div> : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Card>
  );
}

/* -------------------------------------------------------------- */
/* Votes tab                                                      */
/* -------------------------------------------------------------- */

function VotesTab({ tripId, items }) {
  const dispatch = useDispatch();
  const toast = useToast();

  const vote = async (itemId, value) => {
    try {
      await dispatch(castVote({ tripId, itemId, value })).unwrap();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const unvote = async (itemId) => {
    try {
      await dispatch(removeVote({ tripId, itemId })).unwrap();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const proposed = items.filter(
    (i) => (i.status || 'proposed') === 'proposed'
  );

  if (!proposed.length) {
    return (
      <EmptyState
        title="No stops to vote on"
        description="Propose stops in the Itinerary tab and your group can vote."
      />
    );
  }

  return (
    <div className="space-y-3">
      {proposed.map((it) => (
        <Card
          key={it.id}
          className="flex items-center justify-between gap-3 p-4"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">
              {it.title}
            </div>
            <div className="text-xs text-muted">
              Day {it.day_number}
              {it.place ? ` · ${it.place}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => vote(it.id, 'up')}
              className="inline-flex items-center gap-1 rounded-pill border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-emerald-300 hover:text-emerald-600"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {it.upvotes || 0}
            </button>
            <button
              onClick={() => vote(it.id, 'down')}
              className="inline-flex items-center gap-1 rounded-pill border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-red-300 hover:text-red-500"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {it.downvotes || 0}
            </button>
            <button
              onClick={() => unvote(it.id)}
              className="text-[11px] text-muted underline-offset-2 hover:underline"
            >
              clear
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Expenses tab                                                   */
/* -------------------------------------------------------------- */

function ExpensesTab({ tripId, expenses, balances, settleUp, members }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const parsed = useSelector((s) => s.expenses.parsed);
  const parseStatus = useSelector((s) => s.expenses.parseStatus);
  const parseError = useSelector((s) => s.expenses.parseError);

  const [nl, setNl] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const memberById = useMemo(() => {
    const m = new Map();
    members.forEach((x) => m.set(x.user_id, x));
    return m;
  }, [members]);

  const submitNL = async () => {
    if (!nl.trim()) return;
    try {
      await dispatch(parseExpenseText({ tripId, text: nl })).unwrap();
    } catch (err) {
      toast.error(err.message || 'Parse failed');
    }
  };

  const saveParsed = async () => {
    if (!parsed) return;
    if (parsed.needs_clarification) {
      toast.warn(parsed.clarification_question || 'Please clarify names');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: parsed.title,
        amountPaise: parsed.amountPaise,
        paidByUserId: parsed.paidByUserId,
        splitType: parsed.splitType,
        includedUserIds: parsed.includedUserIds,
        entries: parsed.entries,
      };
      await dispatch(createExpense({ tripId, payload })).unwrap();
      toast.success('Expense saved');
      dispatch(clearParsed());
      setNl('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Chat assistant */}
      <AssistantChat
        tripId={tripId}
        onExpenseCreated={() => {
          dispatch(fetchExpenses(tripId));
          dispatch(fetchBalances(tripId));
          dispatch(fetchSettleUp(tripId));
        }}
      />

      {/* Scan bill */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-sm font-semibold text-ink">Scan bill</div>
          <p className="text-xs text-muted">
            Photo of a restaurant bill → itemized, diet-aware split.
          </p>
        </div>
        <Button
          leftIcon={<Camera className="h-4 w-4" />}
          onClick={() => setScanOpen(true)}
        >
          Scan bill
        </Button>
      </Card>

      <ScanBillModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        tripId={tripId}
        onConfirmed={() => {
          dispatch(fetchExpenses(tripId));
          dispatch(fetchBalances(tripId));
          dispatch(fetchSettleUp(tripId));
        }}
      />

      {/* NL parser */}
      <Card className="p-5">
        <div className="text-sm font-semibold text-ink">
          Natural language expense
        </div>
        <p className="text-xs text-muted">
          English ya Hinglish — e.g. "Rahul ne 1200 diye dinner ke liye, Amit ko
          chhod ke 4 mein split"
        </p>
        <textarea
          className="input mt-3 h-24 resize-none"
          value={nl}
          onChange={(e) => setNl(e.target.value)}
          placeholder="Type here…"
        />
        <div className="mt-3 flex gap-2">
          <Button
            onClick={submitNL}
            loading={parseStatus === 'loading'}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Parse with AI
          </Button>
          {parsed && (
            <Button variant="secondary" onClick={() => dispatch(clearParsed())}>
              Clear
            </Button>
          )}
        </div>

        {parseError && (
          <div className="mt-3 rounded-inner border border-red-100 bg-red-50 p-3 text-xs text-red-600">
            {parseError}
          </div>
        )}

        {parsed && (
          <div className="mt-4 rounded-inner border border-brand-100 bg-brand-50/40 p-4 text-sm">
            <div className="font-semibold text-ink">
              {parsed.title} · {formatINR(parsed.amountPaise || 0)}
            </div>
            <div className="mt-1 text-xs text-muted">
              Paid by {parsed.paidByName || 'unknown'} · {parsed.splitType}
            </div>
            {parsed.needs_clarification && (
              <div className="mt-2 rounded-md border border-amber-100 bg-amber-50 p-2 text-xs text-amber-700">
                {parsed.clarification_question}
                {parsed.unknown_names?.length ? (
                  <div>Unknown: {parsed.unknown_names.join(', ')}</div>
                ) : null}
                {parsed.ambiguous_names?.length ? (
                  <div>Ambiguous: {parsed.ambiguous_names.join(', ')}</div>
                ) : null}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button onClick={saveParsed} loading={busy}>
                Save expense
              </Button>
            </div>
          </div>
        )}
      </Card>

      {balances?.length ? (
        <Card className="p-5">
          <div className="subtitle mb-3">Balances</div>
          <ul className="divide-y divide-line">
            {balances.map((b) => {
              const u = memberById.get(b.userId);
              const positive = b.amountPaise > 0;
              return (
                <li
                  key={b.userId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>{u?.name || 'Member'}</span>
                  <span
                    className={positive ? 'text-emerald-600' : 'text-red-500'}
                  >
                    {positive ? 'gets ' : 'owes '}
                    {formatINR(Math.abs(b.amountPaise))}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <SettleUpScreen tripId={tripId} members={members} />

      <div>
        <div className="subtitle mb-3">All expenses</div>
        {expenses?.length ? (
          <ul className="space-y-2">
            {expenses.map((e) => (
              <li key={e.id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {e.title || e.description}
                    </div>
                    <div className="text-xs text-muted">
                      {e.paid_by_name ? `${e.paid_by_name} · ` : ''}
                      {e.category || 'misc'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-brand-600">
                      {formatINR(e.amount_paise)}
                    </div>
                    <button
                      onClick={() =>
                        dispatch(deleteExpense({ tripId, expenseId: e.id }))
                      }
                      className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-500"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="p-6 text-sm text-muted">No expenses yet.</Card>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Wallet tab                                                     */
/* -------------------------------------------------------------- */

function WalletTab({ wallet, txs, members }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [note, setNote] = useState('');

  const topUp = async () => {
    if (!amount) return;
    try {
      await dispatch(
        topUpWallet({
          amountPaise: rupeesToPaise(amount),
          note: note || 'Top-up',
        })
      ).unwrap();
      toast.success('Wallet topped up');
      setAmount('');
      setNote('');
      dispatch(fetchTransactions(25));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const transfer = async () => {
    if (!amount || !toUserId) return;
    try {
      await dispatch(
        transferWallet({
          toUserId,
          amountPaise: rupeesToPaise(amount),
          note: note || 'Transfer',
        })
      ).unwrap();
      toast.success('Transfer done');
      setAmount('');
      setNote('');
      dispatch(fetchTransactions(25));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="subtitle">Wallet balance</div>
        <div className="mt-1 text-3xl font-extrabold text-brand-600">
          {formatINR(wallet?.balance_paise || 0)}
        </div>
      </Card>

      <Card className="p-5">
        <div className="subtitle mb-3">Add / transfer</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink">
              Transfer to
            </label>
            <select
              className="input"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
            >
              <option value="">— select member —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={topUp}>Add money</Button>
          <Button variant="secondary" onClick={transfer}>
            Send
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="subtitle mb-3">Transaction history</div>
        {txs?.length ? (
          <ul className="divide-y divide-line">
            {txs.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <div className="font-medium text-ink">{t.type}</div>
                  <div className="text-xs text-muted">
                    {t.note || '—'} ·{' '}
                    {new Date(t.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="font-semibold text-brand-600">
                  {formatINR(t.amount_paise)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted">No transactions yet.</div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Files tab                                                      */
/* -------------------------------------------------------------- */

function FilesTab({ tripId }) {
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await attachmentsApi.list(tripId);
      setFiles(data || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await attachmentsApi.upload(tripId, file, { kind: 'other' });
      toast.success('Uploaded');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const remove = async (id) => {
    try {
      await attachmentsApi.remove(id);
      setFiles((f) => f.filter((x) => x.id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="subtitle mb-2">Upload ticket or booking</div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-inner border-2 border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted hover:border-brand-300 hover:text-brand-600">
          <Upload className="h-4 w-4" />
          {busy ? 'Uploading…' : 'Choose a PDF or image (max 10 MB)'}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </Card>

      {files.length ? (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id}>
              <Card className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {f.title || f.original_name}
                  </div>
                  <div className="text-xs text-muted">
                    {(f.size_bytes / 1024).toFixed(0)} KB · {f.mime_type}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={attachmentsApi.downloadUrl(f.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => remove(f.id)}
                    className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="p-6 text-sm text-muted">No files yet.</Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Members tab                                                    */
/* -------------------------------------------------------------- */

function MembersTab({ trip }) {
  const toast = useToast();
  const members = trip?.members || [];
  const joinCode = trip?.join_code;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success('Join code copied');
    } catch {
      toast.error('Copy failed — select manually');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="subtitle mb-2">Join code</div>
        <div className="flex items-center gap-3">
          <code className="rounded-inner border border-line bg-canvas px-4 py-2 text-lg font-bold tracking-widest text-ink">
            {joinCode || '——————'}
          </code>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Copy className="h-3.5 w-3.5" />}
            onClick={copy}
          >
            Copy
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Share this with your gang — they can join from My Trips → Join.
        </p>
      </Card>

      <div className="space-y-2">
        {members.map((m) => (
          <Card key={m.user_id} className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
              {initials(m.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{m.name}</div>
              <div className="text-xs text-muted">{m.email}</div>
            </div>
            <Pill>{m.role}</Pill>
          </Card>
        ))}
        {!members.length && (
          <Card className="p-6 text-sm text-muted">No members yet.</Card>
        )}
      </div>
    </div>
  );
}