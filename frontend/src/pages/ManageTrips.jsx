import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Pill from '../components/common/Pill';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import NewTripModal from '../components/trips/NewTripModal';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import useReveal from '../hooks/useReveal';
import { formatINR, rupeesToPaise } from '../utils/format';
import {
  fetchTrips,
  updateTrip,
  deleteTrip,
} from '../features/trips/tripsSlice';

export default function ManageTrips() {
  const { isAuthed } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const revealRef = useReveal();
  const { list, status, error } = useSelector((s) => s.trips);

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: 5000,
    description: '',
  });

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

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title || '',
      destination: t.destination || '',
      startDate: t.start_date || '',
      endDate: t.end_date || '',
      budget: (t.budget_paise || t.budget_per_person_paise || 0) / 100,
      description: t.description || '',
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!form.title || !form.destination || !form.startDate || !form.endDate) {
      toast.warn('Please fill all required fields');
      return;
    }
    try {
      await dispatch(
        updateTrip({
          tripId: editing.id,
          patch: {
            title: form.title,
            destination: form.destination,
            startDate: form.startDate,
            endDate: form.endDate,
            budgetPerPersonPaise: rupeesToPaise(form.budget || 0),
            description: form.description || undefined,
          },
        })
      ).unwrap();
      toast.success('Trip updated');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this trip? Yeh undo nahi hoga.')) return;
    try {
      await dispatch(deleteTrip(id)).unwrap();
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div ref={revealRef} className="min-h-screen">
      <AppHeader />

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="reveal flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Manage Trips
            </h1>
            <div className="subtitle mt-1">
              {list.length} trip{list.length === 1 ? '' : 's'}
            </div>
          </div>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpenNew(true)}
          >
            New Trip
          </Button>
        </div>

        <div className="reveal mt-6 space-y-3">
          {status === 'loading' ? (
            <Card className="p-6 text-sm text-muted">Loading…</Card>
          ) : list.length === 0 ? (
            <EmptyState
              title="No trips yet"
              description="Chalo pehli trip banao!"
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
            list.map((t) => (
              <Card key={t.id} className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 shrink-0 rounded-inner bg-gradient-to-br from-brand-300 via-brand-500 to-indigo-700" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink">{t.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Pill>{t.category || 'Trip'}</Pill>
                    <span>{t.destination}</span>
                    <span>·</span>
                    <span>
                      {formatINR(t.budget_paise || t.budget_per_person_paise || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/trips/${t.id}`}
                    className="rounded-full border border-line bg-white p-2 text-muted hover:border-brand-300 hover:text-brand-600"
                    aria-label="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-full border border-line bg-white p-2 text-muted hover:border-brand-300 hover:text-brand-600"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="rounded-full border border-line bg-white p-2 text-muted hover:border-red-200 hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <Footer />

      <NewTripModal open={openNew} onClose={() => setOpenNew(false)} />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Trip"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="md:col-span-2"
          />
          <Input
            label="Destination"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
          />
          <Input
            label="Budget / person (₹)"
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
          <Input
            label="Start date"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <Input
            label="End date"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="md:col-span-2"
          />
        </div>
      </Modal>
    </div>
  );
}