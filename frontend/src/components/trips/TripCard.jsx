import { Link } from 'react-router-dom';
import { MapPin, Clock, Star } from 'lucide-react';
import TripCover from './TripCover';
import Pill from '../common/Pill';
import { formatINR, formatDateRange, durationDays } from '../../utils/format';

export default function TripCard({ trip }) {
  const title = trip.title || 'Untitled trip';
  const dest = trip.destination || '';

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="card spatial group block overflow-hidden"
    >
      <TripCover
        destination={dest}
        overlay
        rounded="rounded-none"
        className="h-48 w-full"
      >
        <div className="absolute left-3 top-3">
          <Pill className="!bg-white/95 !border-white/60 backdrop-blur">
            {trip.category || 'Trip'}
          </Pill>
        </div>
      </TripCover>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight text-ink group-hover:text-brand-600">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5 text-brand-500" />
          <span className="line-clamp-1">{dest}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {trip.start_date ? durationDays(trip.start_date, trip.end_date) : '—'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              4.6
            </span>
          </div>
          <span className="text-sm font-bold text-brand-600">
            {trip.budget_paise
              ? formatINR(trip.budget_paise)
              : formatINR(trip.budget_per_person_paise || 0)}
          </span>
        </div>
        {trip.start_date && (
          <div className="text-[11px] text-muted">
            {formatDateRange(trip.start_date, trip.end_date)}
          </div>
        )}
      </div>
    </Link>
  );
}