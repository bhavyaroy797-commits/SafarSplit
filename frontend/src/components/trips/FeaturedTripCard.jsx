import { Link } from 'react-router-dom';
import { MapPin, Clock, Star } from 'lucide-react';
import TripCover from './TripCover';
import { formatINR, durationDays } from '../../utils/format';

export default function FeaturedTripCard({ trip }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="card spatial group grid overflow-hidden md:grid-cols-2"
    >
      <TripCover
        destination={trip.destination}
        overlay
        rounded="rounded-none"
        className="h-64 w-full md:h-full"
      />
      <div className="space-y-3 p-6 md:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-glow">
          Featured trip
        </span>
        <h3 className="text-2xl font-extrabold tracking-tight text-ink group-hover:text-brand-600">
          {trip.title || 'Untitled trip'}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-4 w-4 text-brand-500" />
          {trip.destination}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {trip.start_date
              ? durationDays(trip.start_date, trip.end_date)
              : '—'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-400" />
            4.8
          </span>
        </div>
        <div className="pt-2">
          <div className="text-xs text-muted">Starting from</div>
          <div className="text-2xl font-extrabold text-brand-600">
            {formatINR(
              trip.budget_paise || trip.budget_per_person_paise || 0
            )}
            <span className="ml-1 text-sm font-medium text-muted">
              per person
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}