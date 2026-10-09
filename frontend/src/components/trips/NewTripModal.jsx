import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import useToast from '../../hooks/useToast';
import { createTrip } from '../../features/trips/tripsSlice';
import { rupeesToPaise } from '../../utils/format';
import { TRIP_TYPES } from '../../utils/constants';

const EMPTY = {
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
  budget: 5000,
  category: 'beach',
  description: '',
};

export default function NewTripModal({ open, onClose, navigateAfter = true }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.title || !form.destination || !form.startDate || !form.endDate) {
      toast.warn('Please fill title, destination, and dates');
      return;
    }
    setBusy(true);
    try {
      const trip = await dispatch(
        createTrip({
          title: form.title,
          destination: form.destination,
          startDate: form.startDate,
          endDate: form.endDate,
          budgetPaise: rupeesToPaise(form.budget || 0),
          category: form.category,
          description: form.description || undefined,
        })
      ).unwrap();

      toast.success('Trip created!');
      setForm(EMPTY);
      onClose?.();
      if (navigateAfter) navigate(`/trips/${trip.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not create trip');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Trip"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Create
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Trip title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="md:col-span-2"
          placeholder="Goa Weekend"
        />
        <Input
          label="Destination"
          value={form.destination}
          onChange={(e) => setForm({ ...form, destination: e.target.value })}
          placeholder="Goa"
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink">
            Trip type
          </label>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {TRIP_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
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
          label="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="md:col-span-2"
        />
      </div>
    </Modal>
  );
}